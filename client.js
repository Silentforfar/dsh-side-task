window.__ModuleLoader__.load({
  id: '@silentforfar/dsh-side-task',
  factory: (require) => {
    const module = { exports: {} }
    const React = require('react')
    const h = React.createElement

    const NS = 'side-task'
    const PROTOCOL = 'sidetask'
    const KIND = 'sidetask'
    const TAB_TYPE_ID = '@silentforfar/dsh-side-task/sidetask'
    const ADDRESS_PREFIX = `dsh-resource://${PROTOCOL}/session/`

    const zh = {
      'open': '侧边任务',
      'open.aria': '在右侧栏开一个临时会话（同一工作区）',
      'createFailed': '无法创建侧边任务',
      'tab.title': '侧边任务',
    }

    const en = {
      'open': 'Side task',
      'open.aria': 'Open a temporary session in the right sidebar (same workspace)',
      'createFailed': 'Could not create the side task',
      'tab.title': 'Side task',
    }

    const CSS = [
      '.dst-action{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;',
      'border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}',
      '.dst-action:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}',
      '.dst-action:disabled{opacity:.55;cursor:default}',
      '.dst-action{flex:0 0 auto}',
      '.dst-tab{display:flex;width:100%;height:100%;min-width:0;min-height:0}',
    ].join('')

    /** Canonical address for one side-task session. */
    function addressOf(sessionId) {
      return `${ADDRESS_PREFIX}${encodeURIComponent(String(sessionId))}`
    }

    /** The session id carried by an address, or undefined for a foreign address. */
    function parseAddress(address) {
      if (typeof address !== 'string' || !address.startsWith(ADDRESS_PREFIX)) return undefined
      const rest = address.slice(ADDRESS_PREFIX.length).split(/[?#]/)[0]
      try {
        const id = decodeURIComponent(rest)
        return id.length > 0 ? id : undefined
      } catch {
        return undefined
      }
    }

    function waitForAbort(signal) {
      return new Promise((resolve) => {
        if (signal.aborted) resolve()
        else signal.addEventListener('abort', () => resolve(), { once: true })
      })
    }

    function splitIcon() {
      return h(
        'svg',
        {
          width: 17,
          height: 17,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
        },
        h('rect', { key: 'a', x: 4, y: 5, width: 11, height: 14, rx: 2 }),
        h('rect', { key: 'b', x: 17, y: 8, width: 4, height: 8, rx: 1.2, fill: 'currentColor', stroke: 'none' }),
        h('path', { key: 'c', d: 'M7.5 10.5h4M7.5 14h3' }),
      )
    }

    /** Resource provider: retain the side session for the lifetime of one tab. */
    function createResourceProvider(sessions) {
      return {
        protocol: PROTOCOL,
        async *open(resourceAddress, { signal }) {
          const sessionId = parseAddress(resourceAddress)
          if (sessionId === undefined) throw new Error(`side-task: invalid address "${resourceAddress}"`)
          if (signal.aborted) return
          const reference = sessions.retain({ kind: 'session', sessionId }, { source: 'sidebarChat', signal })
          try {
            yield { ok: true, value: { sessionId, reference } }
            await waitForAbort(signal)
          } finally {
            reference.release()
          }
        },
      }
    }

    /** Services this browser module needs before it activates. */
    const inject = [
      'slots',
      'locale',
      'remote',
      'remote.session',
      'resources',
      'sidebarRight',
      'sidebarRightTabs',
      'sessions',
      'layout',
    ]

    /**
     * Mount the side-task trigger, its tab type, and its resource provider.
     * @param ctx - Client plugin context.
     */
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'side-task: dictionaries')
      const t = ctx.locale.bind(NS)

      ctx.effect(() => {
        const tag = document.createElement('style')
        tag.dataset.plugin = '@silentforfar/dsh-side-task'
        tag.textContent = CSS
        document.head.appendChild(tag)
        return () => tag.remove()
      }, 'side-task: styles')

      ctx.effect(() => ctx.resources.register(createResourceProvider(ctx.sessions)), 'side-task: resources')

      ctx.effect(
        () =>
          ctx.sidebarRightTabs.register({
            id: TAB_TYPE_ID,
            kind: KIND,
            patterns: [`dsh-resource://${PROTOCOL}/**`],
            priority: 'builtin',
            canOpen: (address) => parseAddress(address) !== undefined,
            title: (address) => {
              const sessionId = parseAddress(address)
              if (sessionId === undefined) return t('tab.title')
              const summary = ctx.sessions.list?.getSnapshot?.().byId?.[sessionId]
              return summary?.title || t('tab.title')
            },
          }),
        'side-task: tab type',
      )

      ctx.effect(
        () =>
          ctx.slots.inject('sidebar.right.pane.tab', () =>
            ctx.slots.register(
              {
                name: 'sidebar.right.pane.tab',
                key: TAB_TYPE_ID,
                children: { 'sidebar.chat.conversation': { kind: 'single', scope: 'session' } },
              },
              SideTaskTab,
            ),
          ),
        'side-task: tab body',
      )

      /**
       * The tab body: bind the addressed session and hand it to the shipped
       * sidebar chat conversation seat.
       * @param props - tab props supplied by the sidebar.
       */
      function SideTaskTab(props) {
        const { useResource, useTabInfo, SessionProvider, renderSlot } = props
        const info = useTabInfo()
        const tab = info === undefined || info === null ? undefined : info.tab
        const address = tab === undefined ? undefined : tab.contentId
        const sessionId = parseAddress(address)
        const resource = useResource(address)

        // The session is intentionally left in place when the tab closes: a side
        // task that silently vanishes from the list is indistinguishable from
        // data loss. Removing it stays an explicit "永久删除" action.
        React.useEffect(() => () => {}, [sessionId])

        if (resource === undefined || resource.value === undefined) return null
        return h(
          'div',
          { className: 'dst-tab' },
          h(SessionProvider, { session: resource.value.reference }, renderSlot('sidebar.chat.conversation', {})),
        )
      }

      ctx.effect(
        () =>
          ctx.slots.inject('conversation.session.header.actions', () =>
            ctx.slots.register({ name: 'conversation.session.header.actions', id: 'side-task', order: 20 }, SideTaskAction),
          ),
        'side-task: header action',
      )

      /**
       * Header button: create a blank session in this session's workspace and
       * open it as a side-task tab.
       * @param props - owner props carrying the hosting session id.
       */
      function SideTaskAction(props) {
        const [busy, setBusy] = React.useState(false)
        const cwd = props.useSessions((state) => {
          const summary = state?.byId?.[props.sessionId]
          return summary !== null && typeof summary === 'object' && typeof summary.cwd === 'string'
            ? summary.cwd
            : undefined
        })

        const open = async () => {
          if (busy) return
          setBusy(true)
          try {
            const payload = typeof cwd === 'string' && cwd.length > 0 ? { cwd } : {}
            const result = await ctx.remote.session.create(payload)
            if (!result.ok) throw new Error(result.error?.message ?? 'session create failed')
            ctx.sidebarRight.openResource(addressOf(result.value.sessionId), {
              kind: KIND,
              preferNewPane: true,
            })
            // openResource places the tab; the column still has to be revealed.
            try {
              ctx.layout.openRightbar(true, false)
            } catch {
              /* the panel may already be open or pinned fullscreen */
            }
          } catch (error) {
            window.alert(`${t('createFailed')}: ${error instanceof Error ? error.message : String(error)}`)
          } finally {
            setBusy(false)
          }
        }

        return h(
          'button',
          {
            type: 'button',
            className: 'dst-action',
            title: t('open'),
            'aria-label': t('open.aria'),
            disabled: busy,
            onClick: open,
          },
          splitIcon(),
        )
      }
    }

    module.exports.apply = apply
    module.exports.inject = inject
    return module.exports
  },
})

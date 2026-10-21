window.__ModuleLoader__.load({
  id: '@silentforfar/dsh-side-task',
  factory: (require) => {
    const module = { exports: {} }
    const React = require('react')
    const h = React.createElement

    const NS = 'side-task'
    const TAB_TYPE_ID = '@silentforfar/dsh-side-task/sidetask'
    const KIND = 'sidetask'
    const MAPPING_KEY = 'dsh-side-task.mapping.v2'
    const HIDE_STYLE_ID = 'dsh-side-task-hide'

    const zh = {
      'card.title': '侧边任务',
      'card.description': '在同一工作区开一个并行对话',
      'tab.title': '侧边任务',
      'loading': '正在准备侧边任务…',
      'failed': '无法创建侧边任务',
      'prefix': '侧边 · ',
      'hint': '与主任务在同一工作区并行运行；关闭标签后可用同一入口重新打开。',
    }

    const en = {
      'card.title': 'Side task',
      'card.description': 'Open a parallel chat in the same workspace',
      'tab.title': 'Side task',
      'loading': 'Preparing the side task…',
      'failed': 'Could not create the side task',
      'prefix': 'Side · ',
      'hint': 'Runs in the same workspace as the main task; reopen it from the same card after closing.',
    }

    const CSS = [
      '.dst-tab{display:flex;flex-direction:column;width:100%;height:100%;min-width:0;min-height:0}',
      '.dst-tab__hint{flex:none;padding:6px 12px;font-size:12px;line-height:18px;',
      'color:var(--dsw-alias-label-tertiary);border-bottom:1px solid var(--dsw-alias-border-l1)}',
      '.dst-status{display:flex;align-items:center;justify-content:center;height:100%;padding:24px;',
      'font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary);text-align:center}',
      '.dst-status[data-error="true"]{color:var(--dsw-alias-state-error-primary)}',
    ].join('')

    function readMapping() {
      try {
        const raw = localStorage.getItem(MAPPING_KEY)
        const parsed = raw === null ? {} : JSON.parse(raw)
        return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
      } catch {
        return {}
      }
    }

    function writeMapping(mapping) {
      try {
        localStorage.setItem(MAPPING_KEY, JSON.stringify(mapping))
      } catch {
        /* storage unavailable: mapping lasts for this page only */
      }
    }

    function mappingOf(sessionId) {
      const value = readMapping()[String(sessionId)]
      return typeof value === 'string' && value.length > 0 ? value : undefined
    }

    function rememberMapping(sessionId, sideSessionId) {
      const mapping = readMapping()
      mapping[String(sessionId)] = String(sideSessionId)
      writeMapping(mapping)
    }

    /** Hide every mapped side session row from the left list without touching the Host. */
    function syncHiddenRows() {
      const ids = Object.values(readMapping()).filter((value) => typeof value === 'string' && value.length > 0)
      const rules = ids.map((id) => `[data-row-key="session:${id}"]{display:none!important}`).join('')
      let tag = document.getElementById(HIDE_STYLE_ID)
      if (tag === null) {
        tag = document.createElement('style')
        tag.id = HIDE_STYLE_ID
        tag.dataset.plugin = '@silentforfar/dsh-side-task'
        document.head.appendChild(tag)
      }
      if (tag.textContent !== rules) tag.textContent = rules
    }

    function SideTaskGlyph(props) {
      const size = props !== null && typeof props === 'object' && typeof props.size === 'number' ? props.size : 24
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.5,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
        },
        h('rect', { key: 'a', x: 3, y: 4.5, width: 11, height: 15, rx: 2.2 }),
        h('path', { key: 'b', d: 'M17 8.5v7' }),
        h('path', { key: 'c', d: 'M20.5 10.5v3' }),
        h('path', { key: 'd', d: 'M6.5 9h4M6.5 12.5h5M6.5 16h3' }),
      )
    }

    /** Turn a render failure into visible text instead of an empty pane. */
    function boundary(label, render) {
      return class SideTaskBoundary extends React.Component {
        constructor(props) {
          super(props)
          this.state = { error: null }
        }

        static getDerivedStateFromError(error) {
          return { error }
        }

        render() {
          if (this.state.error !== null) {
            return h(
              'div',
              { className: 'dst-status', 'data-error': 'true' },
              `${label}: ${this.state.error instanceof Error ? this.state.error.message : String(this.state.error)}`,
            )
          }
          return render(this.props)
        }
      }
    }

    /** Services this browser module needs before it activates. */
    const inject = ['slots', 'locale', 'remote', 'remote.session', 'sessions', 'sidebarRightTabs']

    /**
     * Mount the guide card, the side-task tab, and its embedded conversation.
     * @param ctx - Client plugin context.
     */
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'side-task: dictionaries')
      const t = ctx.locale.bind(NS)
      /** Visible-failure wrapper (declared before the registration uses it). */
      const SafeTab = boundary('侧边任务渲染失败', (props) => h(SideTaskTab, props))

      ctx.effect(() => {
        const tag = document.createElement('style')
        tag.dataset.plugin = '@silentforfar/dsh-side-task'
        tag.textContent = CSS
        document.head.appendChild(tag)
        return () => tag.remove()
      }, 'side-task: styles')

      ctx.effect(() => {
        try {
          localStorage.removeItem('dsh-side-task.mapping.v1')
        } catch {
          /* nothing to migrate */
        }
        syncHiddenRows()
        const onStorage = (event) => {
          if (event.key === null || event.key === MAPPING_KEY) syncHiddenRows()
        }
        window.addEventListener('storage', onStorage)
        return () => {
          window.removeEventListener('storage', onStorage)
          document.getElementById(HIDE_STYLE_ID)?.remove()
        }
      }, 'side-task: hidden rows')

      ctx.effect(
        () =>
          ctx.sidebarRightTabs.register({
            id: TAB_TYPE_ID,
            kind: KIND,
            priority: 'builtin',
            multiple: false,
            title: () => t('tab.title'),
            guide: [
              {
                id: 'new',
                order: 30,
                title: () => t('card.title'),
                description: () => t('card.description'),
                icon: SideTaskGlyph,
              },
            ],
          }),
        'side-task: tab type and guide card',
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
              SafeTab,
            ),
          ),
        'side-task: tab body',
      )

      // The embedded chat reuses the shipped `sidebar.chat.conversation` seat
      // (registered by ui-subagent). Registering a second global seat here would
      // collide with that single-occupancy slot and fail plugin activation.

      /**
       * Render the addressed session's chat inside the tab.
       * @param props - session-scoped slot props supplied by the sidebar.
       */
      function SideTaskTab(props) {
        const { useTabInfo, SessionProvider, renderSlot, useSessions, sessionId } = props
        const info = useTabInfo()
        const tab = info === undefined || info === null ? undefined : info.tab
        const [sideId, setSideId] = React.useState(undefined)
        const [failure, setFailure] = React.useState(null)
        const cwd = useSessions((state) => {
          const summary = state?.byId?.[sessionId]
          return summary !== null && typeof summary === 'object' && typeof summary.cwd === 'string'
            ? summary.cwd
            : undefined
        })
        const mainTitle = useSessions((state) => {
          const summary = state?.byId?.[sessionId]
          return summary !== null && typeof summary === 'object' && typeof summary.title === 'string'
            ? summary.title
            : ''
        })

        React.useEffect(() => {
          let cancelled = false
          const known = mappingOf(sessionId)
          if (known !== undefined) {
            setSideId(known)
            return () => {
              cancelled = true
            }
          }
          ;(async () => {
            try {
              // Same environment, fresh conversation: a side task runs beside the
              // main task (Qoder's model), so it starts empty instead of copying a
              // potentially huge transcript.
              const payload = typeof cwd === 'string' && cwd.length > 0 ? { cwd } : {}
              const result = await ctx.remote.session.create(payload)
              if (!result.ok) throw new Error(result.error?.message ?? 'create failed')
              const created = result.value.sessionId
              rememberMapping(sessionId, created)
              syncHiddenRows()
              if (!cancelled) setSideId(created)
              const title = `${t('prefix')}${mainTitle || t('tab.title')}`
              void ctx.remote.session.rename({ sessionId: created, title }).catch(() => {})
            } catch (error) {
              if (!cancelled) setFailure(error instanceof Error ? error.message : String(error))
            }
          })()
          return () => {
            cancelled = true
          }
        }, [sessionId])

        const reference = React.useMemo(() => {
          if (sideId === undefined) return undefined
          try {
            return ctx.sessions.retain({ kind: 'session', sessionId: sideId }, { source: 'sidebarChat' })
          } catch {
            return undefined
          }
        }, [sideId])

        React.useEffect(() => {
          return () => {
            if (reference === undefined) return
            try {
              reference.release()
            } catch {
              /* already released */
            }
          }
        }, [reference])

        void tab

        if (failure !== null) {
          return h('div', { className: 'dst-status', 'data-error': 'true' }, `${t('failed')}: ${failure}`)
        }
        if (reference === undefined) return h('div', { className: 'dst-status' }, t('loading'))
        return h(
          'div',
          { className: 'dst-tab', 'data-side-task': '' },
          h('div', { className: 'dst-tab__hint' }, t('hint')),
          h(SessionProvider, { session: reference }, renderSlot('sidebar.chat.conversation', {})),
        )
      }
    }

    module.exports.apply = apply
    module.exports.inject = inject
    return module.exports
  },
})

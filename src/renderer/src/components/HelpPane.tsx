import { Fragment, type JSX } from 'react'
import { useMsg } from '../locale'
import {
  ALL_PANES_ACCEL,
  BROWSE_ACCEL,
  CHANGES_ACCEL,
  PANE_CYCLE_ACCEL,
  PASTE_ACCEL,
  QUICK_OPEN_ACCEL
} from '../panes'
import type { RendererMessages } from '../../../shared/messages'

/**
 * One line of the sheet: the keys as they are printed on the keyboard, and
 * what they do. `keys` is never translated — a chord is the same everywhere —
 * so only the action comes out of the message table.
 */
interface Shortcut {
  keys: string
  action: string
}

interface Section {
  title: string
  rows: Shortcut[]
}

/**
 * The shortcuts, grouped the way the manual groups them. Built from the
 * accelerator constants where the key is defined beside its handler, so a
 * chord that moves cannot leave a stale line here behind.
 */
function sections(msg: RendererMessages): Section[] {
  const h = msg.app.help
  return [
    {
      title: h.sectionCommits,
      rows: [
        { keys: '↑ / ↓ / PgUp / PgDn / Home / End', action: h.moveSelection },
        { keys: 'Enter', action: h.showCommit },
        { keys: 'Ctrl/Cmd+Click / Shift+Click / Space', action: h.markSecond },
        { keys: 'Ctrl+Click', action: h.openFileTab },
        { keys: 'Ctrl+F', action: h.find },
        { keys: 'Ctrl+C / Ctrl+Shift+C', action: h.copy },
        { keys: PASTE_ACCEL, action: h.paste }
      ]
    },
    {
      title: h.sectionViews,
      rows: [
        { keys: 'Esc', action: h.backToChanges },
        { keys: BROWSE_ACCEL, action: h.browse },
        { keys: CHANGES_ACCEL, action: h.changesAllPanes },
        { keys: 'Alt+← / Alt+→', action: h.navHistory }
      ]
    },
    {
      title: h.sectionPanes,
      rows: [
        { keys: 'Ctrl+1 … Ctrl+4', action: h.togglePanes },
        { keys: ALL_PANES_ACCEL, action: h.allPanes },
        { keys: 'Ctrl+Shift+1 … Ctrl+Shift+4', action: h.fillWindow },
        { keys: `${PANE_CYCLE_ACCEL} / Ctrl+Shift+Tab`, action: h.cyclePane }
      ]
    },
    {
      title: h.sectionApp,
      rows: [
        { keys: 'F1', action: h.shortcuts },
        { keys: 'F5 / Ctrl+R', action: h.refresh },
        { keys: 'Ctrl+O', action: h.openRepo },
        { keys: QUICK_OPEN_ACCEL, action: h.quickOpen },
        { keys: 'Ctrl+,', action: h.settings },
        { keys: 'Alt', action: h.menuBar }
      ]
    }
  ]
}

/**
 * The keyboard shortcut sheet, opened with F1 or from the Help menu. Drawn in
 * the renderer like the About dialog, and for the same reason: a native
 * message box cannot lay a table out. Escape is handled by the App, which owns
 * the open state, so this component registers no key listeners of its own.
 */
export function HelpPane(props: { open: boolean; onClose: () => void }): JSX.Element | null {
  const { msg } = useMsg()

  if (!props.open) return null

  return (
    <div
      className="settings-backdrop"
      onMouseDown={(e) => {
        // Clicking the backdrop (not the panel) closes the dialog.
        if (e.target === e.currentTarget) props.onClose()
      }}
    >
      <div className="help">
        <div className="settings-header">
          <span className="settings-title">{msg.app.help.title}</span>
          <button title={msg.app.help.close} onClick={props.onClose}>
            ×
          </button>
        </div>
        <div className="settings-body">
          {/* One table for the whole sheet, headings included as rows: separate
              tables per section would each size their key column to their own
              widest chord, and the actions would not line up down the page. */}
          <table className="help-table">
            <tbody>
              {sections(msg).map((s) => (
                <Fragment key={s.title}>
                  <tr>
                    <th className="help-section-title" colSpan={2}>
                      {s.title}
                    </th>
                  </tr>
                  {s.rows.map((r) => (
                    <tr key={r.keys + r.action}>
                      <td className="help-keys">
                        <kbd>{r.keys}</kbd>
                      </td>
                      <td className="help-action">{r.action}</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div className="settings-footer">
          <button onClick={props.onClose}>{msg.app.help.close}</button>
        </div>
      </div>
    </div>
  )
}

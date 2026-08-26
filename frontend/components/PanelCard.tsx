'use client'

import type { ReactNode } from 'react'

interface PanelCardAction {
  label: string
  onClick: () => void
  variant?: 'default' | 'ghost' | 'danger' | 'text'
}

interface PanelCardProps {
  meta: string
  title?: string
  body: string
  action?: PanelCardAction
  actionInline?: boolean
}

function panelButtonClass(variant: PanelCardAction['variant'] = 'default') {
  switch (variant) {
    case 'text':
      return 'panel-btn panel-btn--text'
    case 'danger':
      return 'panel-btn panel-btn--danger'
    default:
      return 'panel-btn panel-btn--default'
  }
}

export function PanelCard({ meta, title, body, action, actionInline }: PanelCardProps) {
  return (
    <li className="panel-card">
      <div className="panel-card-top">
        <p className="panel-card-meta">{meta}</p>
        {action && actionInline ? (
          <button type="button" className={panelButtonClass(action.variant)} onClick={action.onClick}>
            {action.label}
          </button>
        ) : null}
      </div>
      {title ? <p className="panel-card-body" style={{ marginBottom: '0.375rem', color: 'var(--nux-text)' }}>{title}</p> : null}
      <p className="panel-card-body">{body}</p>
      {action && !actionInline ? (
        <div style={{ marginTop: '0.75rem' }}>
          <button type="button" className={panelButtonClass(action.variant)} onClick={action.onClick}>
            {action.label}
          </button>
        </div>
      ) : null}
    </li>
  )
}

interface PanelSectionProps {
  number?: string
  title: string
  children: ReactNode
}

export function PanelSection({ number, title, children }: PanelSectionProps) {
  return (
    <section className="panel-section">
      <div className="panel-section-header">
        {number ? <span className="panel-section-num">{number}</span> : null}
        <h3 className="panel-section-title">{title}</h3>
      </div>
      {children}
    </section>
  )
}

export function PanelCardList({ children }: { children: ReactNode }) {
  return <ul className="panel-card-list">{children}</ul>
}

export function PanelMuted({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`panel-muted ${className}`.trim()}>{children}</p>
}

export function PanelError({ children }: { children: ReactNode }) {
  return <p className="panel-error">{children}</p>
}

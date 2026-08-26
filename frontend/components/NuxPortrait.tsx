'use client'

import Image from 'next/image'

/** Nux character portrait */
export function NuxPortrait() {
  return (
    <div className="nux-portrait">
      <div className="nux-portrait-frame">
        <Image
          src="/nux-portrait.png"
          alt="Nux"
          width={1400}
          height={1721}
          className="nux-portrait-img"
          priority
          sizes="(max-width: 860px) 72vw, 420px"
        />
      </div>
    </div>
  )
}

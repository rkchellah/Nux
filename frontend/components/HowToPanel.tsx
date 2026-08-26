'use client'

import { PanelCard, PanelCardList, PanelMuted, PanelSection } from '@/components/PanelCard'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'

interface HowToPanelProps {
  open: boolean
  onClose: () => void
  showDesktopNote?: boolean
}

export function HowToPanel({ open, onClose, showDesktopNote }: HowToPanelProps) {
  return (
    <Drawer
      open={open}
      onOpenChange={isOpen => {
        if (!isOpen) onClose()
      }}
    >
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>How to use Nux</DrawerTitle>
          <DrawerClose className="panel-close">Close</DrawerClose>
        </DrawerHeader>

        <div className="panel-body panel-scroll">
          <PanelSection number="01" title="Getting started">
            <PanelCardList>
              <PanelCard
                meta="Step 1"
                body="Tap Talk with Nux and allow camera and microphone access when your browser prompts you."
              />
              <PanelCard
                meta="Step 2"
                body="Point at anything and speak naturally. It responds in real time through voice."
              />
              <PanelCard
                meta="Step 3"
                body="Tap STOP when you are done. Camera and microphone access end with the session."
              />
            </PanelCardList>
          </PanelSection>

          <PanelSection number="02" title="What you can do">
            <PanelCardList>
              <PanelCard
                meta="Live camera · point and ask"
                body="Hold up a plant and ask what species it is. Show a document and ask for a summary."
              />
              <PanelCard
                meta="Voice · hands-free"
                body="Ask follow-up questions, clarify, or explore a topic without typing."
              />
              <PanelCard
                meta="Screen share · when you choose"
                body="Share your desktop to walk through notes, code, or apps together. Nothing is shared until you approve."
              />
              <PanelCard
                meta="Memory · say remember this"
                body="Ask it to remember a fact, preference, or context. Open Trust to review or delete saved memories."
              />
              <PanelCard
                meta="Diagrams · go deeper"
                body="Ask it to draw how something works. A canvas opens with an SVG diagram you can dismiss to return to the camera."
              />
            </PanelCardList>
          </PanelSection>

          <PanelSection number="03" title="During a session">
            <PanelCardList>
              <PanelCard
                meta="Camera controls"
                body="Use FRONT CAM / BACK CAM to flip between cameras. Use STOP to end the session."
              />
              <PanelCard
                meta="Screen share"
                body="Tap SHARE SCREEN to show your desktop, or approve when the agent asks. An amber border confirms when sharing is active."
              />
              <PanelCard
                meta="Diagrams"
                body={'When a diagram opens, tap "Back to view" to return to the live camera feed.'}
              />
              <PanelCard
                meta="Trust panel"
                body="Tap Trust in the session bar to review privacy commitments and manage saved memories."
              />
            </PanelCardList>
          </PanelSection>

          <PanelSection number="04" title="Tips">
            <PanelCardList>
              <PanelCard
                meta="Speak clearly"
                body="Hold the camera steady and pause briefly so it can respond. It listens while you talk."
              />
              <PanelCard
                meta="Privacy first"
                body="Memories are text summaries only - never raw video or audio. You can delete any memory at any time."
              />
              {showDesktopNote ? (
                <PanelCard
                  meta="Mobile vs desktop"
                  body="Screen share works on desktop browsers. On mobile, use the camera and voice for the best experience."
                />
              ) : null}
            </PanelCardList>
          </PanelSection>

          <PanelMuted className="panel-muted--footer">
            Collaborative only - Nux sees, remembers, and draws with you. It never acts on your behalf.
          </PanelMuted>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

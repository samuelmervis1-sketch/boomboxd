import './LoadingScreen.css'

interface LoadingScreenProps {
  /** Fixed overlay covering the whole viewport (default). Set false to render
   *  inline, filling whatever container it's placed in at a smaller scale —
   *  for loading states that sit below page chrome that's already on screen. */
  fullScreen?: boolean
}

export default function LoadingScreen({ fullScreen = true }: LoadingScreenProps) {
  return (
    <div
      className={`loading-screen ${fullScreen ? 'loading-screen-full' : 'loading-screen-inline'}`}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="boombox-stage">
        <div className="boombox-wrap">
          <div className="bb-notes" aria-hidden="true">
            <span className="bb-note n1">♪</span>
            <span className="bb-note n2">♫</span>
            <span className="bb-note n3">♪</span>
            <span className="bb-note n4">♫</span>
            <span className="bb-note n5">♪</span>
          </div>

          <div className="boombox">
            <span className="bb-handle" />
            <span className="bb-antenna" />

            <div className="bb-speaker bb-speaker-left">
              <span className="bb-ring bb-ring-1" />
              <span className="bb-ring bb-ring-2" />
              <span className="bb-cone" />
            </div>

            <div className="bb-deck">
              <div className="bb-window">
                <span className="bb-reel bb-reel-1" />
                <span className="bb-reel bb-reel-2" />
              </div>
              <div className="bb-eq" aria-hidden="true">
                <span /><span /><span /><span /><span />
              </div>
              <div className="bb-buttons">
                <span /><span /><span />
              </div>
            </div>

            <div className="bb-speaker bb-speaker-right">
              <span className="bb-ring bb-ring-1" />
              <span className="bb-ring bb-ring-2" />
              <span className="bb-cone" />
            </div>
          </div>
        </div>
      </div>
      <p className="loading-screen-label">boomboxd</p>
    </div>
  )
}

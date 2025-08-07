"use client"


export function TestHolidayButton() {
  const [showMenu, setShowMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault()
    console.log('✅ TEST BUTTON: Right-click worked!', {
      x: e.clientX,
      y: e.clientY
    })
    setMenuPosition({ x: e.clientX, y: e.clientY })
    setShowMenu(true)
  }

  return (
    <>
      <div 
        className="bg-green-500 text-white px-4 py-2 rounded cursor-pointer hover:bg-green-600"
        onContextMenu={handleRightClick}
        onClick={() => console.log('✅ TEST BUTTON: Left click')}
      >
        TEST: Right-click me!
      </div>

      {showMenu && (
        <div
          className="fixed bg-white border-2 border-green-500 rounded p-4 z-[999999]"
          style={{ left: menuPosition.x, top: menuPosition.y }}
          onClick={() => setShowMenu(false)}
        >
          ✅ Custom menu works!
        </div>
      )}
    </>
  )
}
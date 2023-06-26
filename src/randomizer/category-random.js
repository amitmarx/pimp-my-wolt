// category-random files are temporary until a modal will be written. 

// function rndCategory() {
//     num = Math.floor(Math.random() * foodArr.length);
//     document.getElementById("generated-text").innerHTML = 
//     ("Looks like we are eating " +foodArr[num] + " food today!")
// }
const isHebrewWolt = window.location.href.toLowerCase().includes("com/he/");
const suggestedRandomText = isHebrewWolt
? "מה נאכל היום?"
: "What are we going to eat today?";
//TODO - Check if woltMainBar is available - 
const isWoltMainBar = () => {
  Boolean(document.querySelector('div.sc-7d7c6c58-1.gjijOf div.sc-7d7c6c58-5.ldWo'));
}
if (isWoltMainBar) {
  console.log('wolt main bar detected');
} else {
  console.log('none');
}

const sectors = [
    { color: '#f82', label: 'Mexican' },
    { color: '#0bf', label: 'Indian' },
    { color: '#fb0', label: 'Italian' },
    { color: '#0fb', label: 'Middle eastern' },
    { color: '#b0f', label: 'Japanese' },
    { color: '#f0b', label: 'Thai food' },
    { color: '#bf0', label: 'Ethiopian' }
]
  
  const rand = (m, M) => Math.random() * (M - m) + m
  const tot = sectors.length
  const spinEl = document.querySelector('#spin')
  const ctx = document.querySelector('#wheel').getContext('2d')
  const dia = ctx.canvas.width
  const rad = dia / 2
  const PI = Math.PI
  const TAU = 2 * PI
  const arc = TAU / sectors.length
  
  const friction = 0.991 // 0.995=soft, 0.99=mid, 0.98=hard
  let angVel = 0 // Angular velocity
  let ang = 0 // Angle in radians
  
  const getIndex = () => Math.floor(tot - (ang / TAU) * tot) % tot
  
  function drawSector(sector, i) {
    const ang = arc * i
    ctx.save()
    // COLOR
    ctx.beginPath()
    ctx.fillStyle = sector.color
    ctx.moveTo(rad, rad)
    ctx.arc(rad, rad, rad, ang, ang + arc)
    ctx.lineTo(rad, rad)
    ctx.fill()
    // TEXT
    ctx.translate(rad, rad)
    ctx.rotate(ang + arc / 2)
    ctx.textAlign = 'right'
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 30px sans-serif'
    ctx.fillText(sector.label, rad - 10, 10)
    //
    ctx.restore()
  }
  
  function rotate() {
    const sector = sectors[getIndex()]
    ctx.canvas.style.transform = `rotate(${ang - PI / 2}rad)`
    spinEl.textContent = !angVel ? 'SPIN' : sector.label
    spinEl.style.background = sector.color
  }
  
  function frame() {
    if (!angVel) return
    angVel *= friction // Decrement velocity by friction
    if (angVel < 0.002) angVel = 0 // Bring to stop
    ang += angVel // Update angle
    ang %= TAU // Normalize angle
    rotate()
  }
  
  function engine() {
    frame()
    requestAnimationFrame(engine)
  }
  
  function init() {
    sectors.forEach(drawSector)
    rotate() // Initial rotation
    engine() // Start engine
    spinEl.addEventListener('click', () => {
      if (!angVel) angVel = rand(0.25, 0.45)
    })
  }
  
  init();
  
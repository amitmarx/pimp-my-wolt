const sectors = [
  { color: '#f82', label: 'Mexican' },
  { color: '#0bf', label: 'Indian' },
  { color: '#fb0', label: 'Italian' },
  { color: '#0fb', label: 'Israeli' },
  { color: '#b0f', label: 'Sushi' }, //Because japanese was too long and I didn't want to play with it that much (8
  { color: '#f0b', label: 'Thai' },
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
let lastLabel = '';

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
  ctx.font = 'bold 25px sans-serif'
  ctx.fillText(sector.label, rad - 10, 10)
  //
  ctx.restore()
}

function rotate() {
  const sector = sectors[getIndex()]
  ctx.canvas.style.transform = `rotate(${ang - PI / 2}rad)`
  spinEl.textContent = !angVel ? lastLabel !== ''? lastLabel : 'SPIN' : sector.label;

  if (!angVel && lastLabel !== '') {
      setTimeout(() => {
        spinEl.textContent = 'SPIN';
      }, 2000);
    }

  spinEl.style.background = sector.color;
  lastLabel = sector.label;
}

function frame() {
  if (!angVel) return
  angVel *= friction // Decrement velocity by friction
  if (angVel < 0.002) angVel = 0 // Bring to stop
  ang += angVel // Update angle
  ang %= TAU // Normalize angle
  rotate()

  if (angVel === 0) {
      // The spin has stopped, you can access the last displayed label here
      console.log('Last label:', lastLabel);
      var spinDiv = document.getElementById("spin");
      spinDiv.textContent = lastLabel;
      spinDiv.setAttribute('data-last-label', lastLabel);
  }
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

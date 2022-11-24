const BACKGROUND_COLOR = "white";
const COLOR_UNDER_PIXEL = 'white'; // I'm not sure how these two interact.
const PIXEL_FILL_SIZE = 63; //
const PIXEL_UNFILLED_SIZE = 64; // this places an upper bound on PIXEL_FILL_SIZE, before overflowing.
const MAX_NUMBER_OF_COLORED_PIXELS = 64;
const ALPHA_DECR = 0.008;
const DELTA = 10; // time between two animations in milliseconds
const COLORS = ['black','black','black','black','black'];

let pixels = [];
let width, height;
let coloredPixels = [];
let currentColoredPixelIndex = 0;
const mousePosition = { x: window.innerWidth/2, y: window.innerHeight/2 };

const canvas = document.getElementById('canvas');
canvas.style.background=BACKGROUND_COLOR;
const ctx = canvas.getContext('2d');


/**
 * tell if the neighbor of (x,y) has alpha to 0 or not. Direction is one of eight values
 * (0,1),(1,1),(-1,1),(1,-1),(-1,-1),(1,0)
 * */
function neighbor(x,y,d){
  //check if neighbor is in coloredPixels

  coloredPixels.some(e => e.x == x+d[0] && e.y == y+ d[1]);
  
}

function allNeighborsButNotSelf(coloredPixel){
  return neighbor(coloredPixel.x,coloredPixel.y,[0,1])   &&
  neighbor(coloredPixel.x,coloredPixel.y,[1,0])   &&
  neighbor(coloredPixel.x,coloredPixel.y,[0,-1])  &&
  neighbor(coloredPixel.x,coloredPixel.y,[-1,0])  &&
  neighbor(coloredPixel.x,coloredPixel.y,[1,1])   &&
  neighbor(coloredPixel.x,coloredPixel.y,[0,0])   &&
  neighbor(coloredPixel.x,coloredPixel.y,[-1,-1]) &&
  neighbor(coloredPixel.x,coloredPixel.y,[0,1])   &&
  !  neighbor(coloredPixel.x,coloredPixel.y,[0,0]);
}



function movePix(coloredPixel){
  coloredPixel.x += coloredPixel.vx;
  coloredPixel.y += coloredPixel.vy;
}


/**
 * x + y*w is the index of the pixel in the list of pixels.
 * */
function pixCoord(coloredPixel){
  return Math.floor(coloredPixel.y/PIXEL_UNFILLED_SIZE)*(Math.floor(width/PIXEL_UNFILLED_SIZE)+1) + Math.floor(coloredPixel.x/PIXEL_UNFILLED_SIZE);
}

const drawGrid = () => {
  
  for (pixel of pixels) {
    pixel.color = BACKGROUND_COLOR;
  }
  
  for (coloredPixel of coloredPixels) {
    var pix = pixCoord(coloredPixel); 
    if (0 <= pix && pix < pixels.length) {// If pixel is not out of frame.
      pixels[pix].color = coloredPixel.color;
      pixels[pix].alpha = coloredPixel.alpha;
      
      coloredPixel.alpha = Math.max(coloredPixel.alpha-ALPHA_DECR,0); 
      movePix(coloredPixel);
    }//else should probably delete
  }
  
  for (const pixel of pixels) {
    if (allNeighborsButNotSelf(pixel)){console.log("ok!");launchPixel(pixel);}

    ctx.globalAlpha = 1;
    ctx.fillStyle = COLOR_UNDER_PIXEL;
    ctx.fillRect(pixel.x, pixel.y, pixel.width, pixel.height);



    ctx.globalAlpha = pixel.alpha;
    ctx.fillStyle = pixel.color;
    ctx.fillRect(pixel.x, pixel.y, pixel.width, pixel.height);
  }
}

const resize = () => {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
  pixels = [];
  for (var y = 0; y < height/PIXEL_UNFILLED_SIZE; y++) {
    for (var x = 0; x < width/PIXEL_UNFILLED_SIZE; x++) {
      // Register each pixel (needed in drawing)
      pixels.push({
        x:x*PIXEL_UNFILLED_SIZE,
        y: y*PIXEL_UNFILLED_SIZE,
        alpha: 1,  //    
        color: BACKGROUND_COLOR,//seems to be useless btw
        width: PIXEL_FILL_SIZE,
        height: PIXEL_FILL_SIZE
    });
    }
  }
}

let previousTimestamp;

const draw = (timestamp) => {
  if (previousTimestamp === undefined) {
    previousTimestamp = timestamp;
    }
  const elapsed_since_last = timestamp - previousTimestamp;
  if (elapsed_since_last > DELTA){
    previousTimestamp = timestamp;
    if (mouseDown){launchPixel(mousePosition.x,mousePosition.y);}
    drawGrid();
  }
  requestAnimationFrame(draw);
}

const initColoredPixels = () => {
  for (var i = 0; i < MAX_NUMBER_OF_COLORED_PIXELS; i++) {
    coloredPixels.push({
      x: Math.floor(Math.random()*width),
      y: Math.floor(Math.random()*height),
      alpha: 1,
      color: COLORS[i%COLORS.length],
      vx: -1 + Math.random()*4,
      vy: -1 + Math.random()*4
    })
  }
}

const launchPixel = (x,y) => {
  coloredPixels[currentColoredPixelIndex].x = x;
  coloredPixels[currentColoredPixelIndex].y = y;
  coloredPixels[currentColoredPixelIndex].alpha = 1;
  
  currentColoredPixelIndex = (currentColoredPixelIndex + 1) % MAX_NUMBER_OF_COLORED_PIXELS;
}

resize();
initColoredPixels();
draw();

function listenerMouse(e) {
        mousePosition.x = e.pageX;
        mousePosition.y = e.pageY;
}

window.addEventListener('resize', resize);
window.addEventListener('mousemove',function(e){if(mouseDown){listenerMouse(e)}})
window.addEventListener('click',listenerMouse)

const touchMove = (e) => {
  e.preventDefault();
  mousePosition.x = e.touches.x.pageX;
  mousePosition.y = e.touches.x.pageY;
}

document.addEventListener('touchstart', touchMove);
document.addEventListener('touchmove', touchMove);

var mouseDown = 0;
document.body.onmousedown = function() { 
  mouseDown = 1;
}
document.body.onmouseup = function() {
  mouseDown = 0;
}


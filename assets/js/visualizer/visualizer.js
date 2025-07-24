const defaultKeyboardWidth = 1196.5;
let visualizerWidth;
export let visualizerHeight; // is 50vh, variable is set by getting actual height of element
export let onscreenDurationMillis; // gets set dynamically in resizeVisualizerCanvas()
const velocity = 150; // pixels per second
let keyboard; // holds keyboard SVG element
let visualizer; // holds visualizer SVG element

export function setReferencesToElements(keyboardElement, visualizerElement) {
    keyboard = keyboardElement;
    visualizer = visualizerElement;
}

export function resizeVisualizerCanvas() {
    visualizerWidth = keyboard.clientWidth;
    visualizerHeight = visualizer.clientHeight;
    // visualizerHeight = 3 * keyboard.clientHeight;
    visualizer.setAttribute("width", visualizerWidth);
    // visualizer.setAttribute("height", visualizerHeight);

    modifyAnimationDuration(`${10 * visualizerHeight / velocity}s`); // multiply by 10 because the end keyframe is 1000%
    onscreenDurationMillis = 1000 * visualizerHeight / velocity; // velocity is pixels/sec, multiply by 1000 to get ms
}

/**
 * 
 * @param {SVGElement} svgKey the actual key SVGElement being played
 * @param {Number} noteDuration how long the note is going to be played 
 * @param {String} noteColor the color of the note
 */
export function drawRect(svgKey, noteDuration, noteColor, override) {
    const xPos = Number(svgKey.getAttribute("x")) * visualizerWidth/defaultKeyboardWidth;
    let yPos = visualizerHeight;
    const rectWidth = Number(svgKey.getAttribute("width")) * visualizerWidth/defaultKeyboardWidth;
    let rectHeight = velocity * noteDuration / 1000; // velocity is in pixels/sec but duration is in milliseconds

    if (override) {
        yPos = override.yPos;
    }

    const newRect = document.createElementNS("http://www.w3.org/2000/svg", 'rect');
    newRect.style.fill = noteColor;
    newRect.style.strokeWidth = "1px";
    newRect.style.stroke = "black";
    newRect.setAttribute("x", xPos)
    newRect.setAttribute("y", yPos + 1); // +1 to cover for the stroke width being 1px
    newRect.setAttribute("width", rectWidth);
    newRect.setAttribute("height", rectHeight);
    newRect.setAttribute("position", "relative");
    newRect.classList.add("visualizerAnimation");
    visualizer.appendChild(newRect);

    return newRect;
}

/**
 * Modifies the CSS rule animation-duration on the .visualizerAnimation class
 * @param {String} duration must be a string e.g. "10s" because it'll be used in the CSS rule animation-duration
 */
function modifyAnimationDuration(duration) {
    const css = document.styleSheets[0].cssRules;

    for (const rule of css) {
        if (rule.selectorText === ".visualizerAnimation") {
            rule.style.animationDuration = duration;
        }
    }
}
const defaultKeyboardWidth = 1196.5;
let visualizerWidth;
export let visualizerHeight;
let onscreenDurationMillis = 2000; 
let keyboard; // holds keyboard SVG element
let visualizer; // holds visualizer SVG element

export function setReferencesToElements(keyboardElement, visualizerElement) {
    keyboard = keyboardElement;
    visualizer = visualizerElement;
}

export function resizeVisualizerCanvas() {
    visualizerWidth = keyboard.clientWidth;
    visualizerHeight = 3 * keyboard.clientHeight;
    visualizer.setAttribute("width", visualizerWidth);
    visualizer.setAttribute("height", visualizerHeight);
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
    const velocity = visualizerHeight/onscreenDurationMillis; // pixels per millisecond
    let rectHeight = velocity * noteDuration; // velocity * time = distance

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
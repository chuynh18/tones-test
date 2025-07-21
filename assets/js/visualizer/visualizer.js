export function resizeVisualizerCanvas(keyboardElement, visualizerElement) {
    visualizerElement.width = keyboardElement.clientWidth;
    visualizerElement.height = keyboardElement.clientHeight;
}
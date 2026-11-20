// Track baked ink on the canvas itself so cloned or cached textures retain it.
export function printInk(context,...args){
 context.canvas.dataset.printedInk='1';
 context.fillText(...args);
}

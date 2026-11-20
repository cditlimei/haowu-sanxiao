export function renderTools(){
 for(const id of ['hint','undo','shuffle','freeze']){
  const canvas=document.querySelector('#'+id+' .tool-icon');
  const image=new Image();
  image.onload=()=>{
   const ctx=canvas.getContext('2d');
   const scale=.92*Math.min(canvas.width/image.width,canvas.height/image.height);
   const w=image.width*scale,h=image.height*scale;
   ctx.clearRect(0,0,canvas.width,canvas.height);
   ctx.drawImage(image,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
  };
  image.src=new URL('./assets/real-surfaces/tool-'+id+'.webp',import.meta.url).href;
 }
}

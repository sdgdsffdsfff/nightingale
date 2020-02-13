/**
 * 简单的将文本添加到剪贴板
 * @param  {String}  text 待添加的文本
 * @return {Boolean}      是否成功
 */
export default function clipboard(text) {
  const fakeElem = document.createElement('textarea');
  fakeElem.style.border = '0';
  fakeElem.style.padding = '0';
  fakeElem.style.margin = '0';
  fakeElem.style.position = 'absolute';
  fakeElem.style.left = '-9999px';
  const yPosition = window.pageYOffset || document.documentElement.scrollTop;
  fakeElem.style.top = `${yPosition}px`;
  fakeElem.setAttribute('readonly', '');
  fakeElem.value = text;

  document.body.appendChild(fakeElem);
  fakeElem.select();
  let succeeded;
  try {
    succeeded = document.execCommand('copy');
  } catch (err) {
    succeeded = false;
  }
  if (succeeded) {
    document.body.removeChild(fakeElem);
  }
  return succeeded;
}

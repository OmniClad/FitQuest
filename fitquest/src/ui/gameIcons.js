export function iconUrl(name, color) {
  const c = encodeURIComponent(color || '#FFFFFF');
  return `https://api.iconify.design/game-icons:${name}.svg?color=${c}`;
}

export function buildIconImg(iconName, color, sizeClass, fallbackEmoji) {
  const url = iconUrl(iconName, color);
  return `<img src="${url}" class="${sizeClass}" alt="" onerror="this.outerHTML='<span class=&quot;${sizeClass.replace('-img', '-emoji')} boss-emoji&quot;>${fallbackEmoji}</span>'">`;
}

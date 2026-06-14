// Cloudflare Pages 中间件：按访问域名决定根路径返回哪个版本
//   dev.dungeonraid.win/   → 开发版 dungeon-raid-dev.html
//   其它(dungeonraid.win/)  → 正式版 dungeon-raid.html
// 其余路径(/dungeon-raid.html、/?rec=... 等)正常按静态资源处理。
export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);
  if (url.pathname === '/') {
    const file = url.hostname.startsWith('dev.') ? '/dungeon-raid-dev.html' : '/dungeon-raid.html';
    return env.ASSETS.fetch(new URL(file, url));
  }
  return next();
}

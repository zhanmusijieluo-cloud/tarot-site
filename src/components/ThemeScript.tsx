/**
 * 主题初始化脚本：SSR 前注入，避免主题闪烁。
 * 从 localStorage 读取用户选择的意识色调。
 */
export default function ThemeScript() {
  const code = `(function(){try{var t=localStorage.getItem('oracle-theme');if(t&&['astral-void','rose-mist','matcha-sanctuary','solar-archive'].indexOf(t)>=0){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

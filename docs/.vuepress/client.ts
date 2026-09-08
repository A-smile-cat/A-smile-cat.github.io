import { defineClientConfig } from "vuepress/client";
import { onMounted } from "vue";

import "./styles/custom.scss";

const taglines = [
  "一只敲代码时会碎碎念的程序喵 🐱",
  "热爱技术，享受编码的乐趣 💻",
  "持续学习，不断成长 🚀",
  "用代码改变世界 ✨",
];

/** 打字机动画 */
const initTypingEffect = () => {
  const taglineEl = document.querySelector(
    ".vp-hero-tagline, .tagline, [class*='tagline']"
  ) as HTMLElement;
  if (!taglineEl) return;

  let currentIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let isWaiting = false;
  const typeSpeed = 100;
  const deleteSpeed = 60;
  const waitTime = 2000;

  taglineEl.innerHTML = `<span class="typed-text"></span><span class="typed-cursor">|</span>`;
  const typedSpan = taglineEl.querySelector(".typed-text") as HTMLSpanElement;
  const cursorSpan = taglineEl.querySelector(".typed-cursor") as HTMLSpanElement;

  const type = () => {
    if (isWaiting) return;
    const current = taglines[currentIndex];

    if (!isDeleting) {
      typedSpan.textContent = current.substring(0, charIndex + 1);
      charIndex++;

      if (charIndex === current.length) {
        isWaiting = true;
        cursorSpan.classList.add("blink");
        setTimeout(() => {
          isWaiting = false;
          cursorSpan.classList.remove("blink");
          isDeleting = true;
          type();
        }, waitTime);
        return;
      }
      setTimeout(type, typeSpeed);
    } else {
      typedSpan.textContent = current.substring(0, charIndex - 1);
      charIndex--;

      if (charIndex === 0) {
        isDeleting = false;
        currentIndex = (currentIndex + 1) % taglines.length;
        setTimeout(type, 500);
        return;
      }
      setTimeout(type, deleteSpeed);
    }
  };

  setTimeout(type, 1500);
};

/** 注入页脚：2 行 2 栏网格 */
const injectFooter = () => {
  const wrapper = document.querySelector(".vp-footer-wrapper");
  if (!wrapper) return;

  const origFooter = wrapper.querySelector(".vp-footer") as HTMLElement;
  const origCopyright = wrapper.querySelector(".vp-copyright") as HTMLElement;

  // 隐藏原元素
  if (origFooter) origFooter.style.display = "none";
  if (origCopyright) origCopyright.style.display = "none";

  // 建站日期 🎯 改成你自己的
  const startDate = new Date("2024-01-01T00:00:00");

  const grid = document.createElement("div");
  grid.className = "footer-grid";
  grid.innerHTML = `
    <div class="footer-cell footer-stats">
      <span id="busuanzi_container_site_pv" style="display:none">本站总访问量 <span id="busuanzi_value_site_pv"></span> 次</span>
      <span id="busuanzi_container_site_uv" style="display:none"> | 本站访客数 <span id="busuanzi_value_site_uv"></span> 人次</span>
    </div>
    <div class="footer-cell footer-powered">
      ${origFooter ? origFooter.innerHTML : 'Powered by <a href="https://v2.vuepress.vuejs.org/zh/" target="_blank">VuePress</a> | Theme <a href="https://theme-hope.vuejs.press/zh/" target="_blank">Hope</a>'}
    </div>
    <div class="footer-cell footer-uptime"></div>
    <div class="footer-cell footer-copyright">
      ${origCopyright ? origCopyright.innerHTML : "Copyright © 2024 - present A-smile-cat"}
    </div>
  `;

  wrapper.insertBefore(grid, wrapper.firstChild);

  // 运行时间计时器
  const uptimeEl = grid.querySelector(".footer-uptime")!;
  const updateUptime = () => {
    const diff = Date.now() - startDate.getTime();
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    uptimeEl.textContent = `本站已运行 ${d} 天 ${h} 小时 ${m} 分钟 ${s} 秒`;
  };
  updateUptime();
  setInterval(updateUptime, 1000);

  // busuanzi 脚本
  const script = document.createElement("script");
  script.async = true;
  script.src = "//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js";
  document.head.appendChild(script);
};

export default defineClientConfig({
  setup() {
    onMounted(() => {
      setTimeout(() => {
        initTypingEffect();
        injectFooter();
      }, 500);
    });
  },
});

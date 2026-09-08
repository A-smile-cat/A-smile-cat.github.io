import { defineClientConfig } from "vuepress/client";
import { onMounted } from "vue";

import "./styles/custom.scss";

const taglines = [
  "热爱技术，享受编码的乐趣 💻",
  "持续学习，不断成长 🚀",
  "用代码改变世界 ✨",
  "记录学习，分享技术 📝",
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

/** busuanzi 访问计数 */
const initBusuanzi = () => {
  // 注入 busuanzi 脚本
  const script = document.createElement("script");
  script.async = true;
  script.src = "//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js";
  document.head.appendChild(script);
};

/** 站点运行时间计时器 */
const initUptime = () => {
  // 🎯 建站日期，改成你自己的
  const startDate = new Date("2024-01-01T00:00:00");

  const uptimeEl = document.createElement("div");
  uptimeEl.className = "site-uptime";

  const updateUptime = () => {
    const now = new Date();
    const diff = now.getTime() - startDate.getTime();

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    uptimeEl.textContent = `本站已运行 ${days} 天 ${hours} 小时 ${minutes} 分钟 ${seconds} 秒`;
  };

  updateUptime();
  setInterval(updateUptime, 1000);
  return uptimeEl;
};

/** 将自定义信息注入页脚 */
const injectFooterInfo = () => {
  const footerWrapper = document.querySelector(".vp-footer-wrapper");
  if (!footerWrapper) return;

  // busuanzi 访问统计
  const statsEl = document.createElement("div");
  statsEl.className = "busuanzi-stats";
  statsEl.innerHTML = `
    <span id="busuanzi_container_site_pv" style="display:none">
      本站总访问量 <span id="busuanzi_value_site_pv"></span> 次
    </span>
    <span id="busuanzi_container_site_uv" style="display:none">
       | 本站访客数 <span id="busuanzi_value_site_uv"></span> 人次
    </span>
  `;
  footerWrapper.insertBefore(statsEl, footerWrapper.firstChild);

  // 站点运行时间
  const uptimeEl = initUptime();
  footerWrapper.insertBefore(uptimeEl, statsEl.nextSibling);
};

export default defineClientConfig({
  setup() {
    onMounted(() => {
      setTimeout(() => {
        initTypingEffect();
        initBusuanzi();
        injectFooterInfo();
      }, 500);
    });
  },
});

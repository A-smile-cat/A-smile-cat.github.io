import { defineClientConfig } from "vuepress/client";
import { onMounted } from "vue";

import "./styles/custom.scss";

const taglines = [
  "热爱技术，享受编码的乐趣 💻",
  "持续学习，不断成长 🚀",
  "用代码改变世界 ✨",
  "记录学习，分享技术 📝",
];

export default defineClientConfig({
  setup() {
    onMounted(() => {
      // 等待 DOM 渲染完成
      setTimeout(() => {
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

        // 创建打字机容器
        taglineEl.innerHTML = `<span class="typed-text"></span><span class="typed-cursor">|</span>`;
        const typedSpan = taglineEl.querySelector(
          ".typed-text"
        ) as HTMLSpanElement;
        const cursorSpan = taglineEl.querySelector(
          ".typed-cursor"
        ) as HTMLSpanElement;

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

        // 延迟启动打字动画
        setTimeout(type, 1500);
      }, 500);
    });
  },
});

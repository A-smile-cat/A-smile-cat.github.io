import { defineClientConfig } from "vuepress/client";
import { computed, defineComponent, h, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute } from "vuepress/client";

import "./styles/custom.scss";

const taglines = [
  "一只敲代码时会碎碎念的程序喵 🐱",
  "热爱技术，享受编码的乐趣 💻",
  "持续学习，不断成长 🚀",
  "用代码改变世界 ✨",
];

/**
 * 打字机动画
 * 返回清理函数；元素未找到时返回 null（由调用方重试）。
 */
const startTypingEffect = (): (() => void) | null => {
  // BlogHome 布局的标语类名是 .vp-blog-hero-description（theme-hope BlogHero 组件）
  // 普通首页布局则是 #main-description，这里一并兼容
  const taglineEl = document.querySelector<HTMLElement>(
    ".vp-blog-hero-description, #main-description, .vp-hero-tagline, .tagline"
  );
  if (!taglineEl) return null;

  // 已经初始化过（如 SPA 返回首页时元素被复用）
  if (taglineEl.querySelector(".typed-text")) return () => {};

  let currentIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let timer = 0;
  let stopped = false;

  taglineEl.innerHTML = `<span class="typed-text"></span><span class="typed-cursor">|</span>`;
  const typedSpan = taglineEl.querySelector(".typed-text") as HTMLSpanElement;
  const cursorSpan = taglineEl.querySelector(".typed-cursor") as HTMLSpanElement;

  const type = () => {
    // SPA 路由切换后元素已从文档移除时停止
    if (stopped || !typedSpan.isConnected) return;
    const current = taglines[currentIndex];

    if (!isDeleting) {
      typedSpan.textContent = current.substring(0, charIndex + 1);
      charIndex++;

      if (charIndex === current.length) {
        cursorSpan.classList.add("blink");
        timer = window.setTimeout(() => {
          cursorSpan.classList.remove("blink");
          isDeleting = true;
          type();
        }, 2000);
        return;
      }
      timer = window.setTimeout(type, 100);
    } else {
      typedSpan.textContent = current.substring(0, charIndex - 1);
      charIndex--;

      if (charIndex === 0) {
        isDeleting = false;
        currentIndex = (currentIndex + 1) % taglines.length;
        timer = window.setTimeout(type, 500);
        return;
      }
      timer = window.setTimeout(type, 60);
    }
  };

  timer = window.setTimeout(type, 1500);

  return () => {
    stopped = true;
    window.clearTimeout(timer);
  };
};

/** 注入页脚：2 行 2 栏网格 */
const injectFooter = () => {
  const wrapper = document.querySelector(".vp-footer-wrapper");
  if (!wrapper) return;
  if (wrapper.querySelector(".footer-grid")) return; // 避免重复注入

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

/* --------------------------------------------------------------------------
 * 受保护页面的前端解密
 * --------------------------------------------------------------------------
 * docs/.vuepress/plugins/encrypted-pages.ts 会在构建期把受保护目录下的正文
 * 渲染成 HTML 后用 AES-256-GCM 加密，页面上只留下密文。这里用访问者输入的口令
 * 通过 PBKDF2-SHA256 派生同一把密钥解密，再渲染得到的 HTML。
 * 全程使用浏览器原生 WebCrypto：不依赖后端，也不发起任何请求。
 *
 * 注意：迭代次数必须与 plugins/encrypted-pages.ts 中的 ITERATIONS 保持一致。
 */

interface EncryptedPayload {
  /** PBKDF2 迭代次数 */
  i: number;
  /** base64 盐值 */
  s: string;
  /** base64 初始向量 */
  v: string;
  /** base64 密文（末尾含 GCM 认证标签） */
  c: string;
}

const SESSION_KEY = "smilecat-encrypted-content";
const LOCAL_KEY = "smilecat-encrypted-content-remember";

/** 同一会话内跨页面复用口令，避免在受保护页面之间跳转时反复输入 */
let cachedPassword = "";

const decodeBase64 = (value: string): Uint8Array =>
  Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

const decryptPayload = async (
  password: string,
  payload: EncryptedPayload
): Promise<string> => {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: decodeBase64(payload.s),
      iterations: payload.i,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  // 口令不对时 GCM 的认证校验会失败并抛出，拿不到任何明文
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decodeBase64(payload.v) },
    key,
    decodeBase64(payload.c)
  );
  return new TextDecoder().decode(plain);
};

const INPUT_BORDER = "1px solid rgba(128, 128, 128, 0.35)";

const EncryptedContent = defineComponent({
  name: "EncryptedContent",

  props: {
    payload: { type: String, required: true },
  },

  setup(props) {
    const html = ref("");
    const input = ref("");
    const failed = ref(false);
    const busy = ref(false);
    const remember = ref(false);

    const payload = computed<EncryptedPayload>(() => JSON.parse(atob(props.payload)));

    const unlock = async (password: string, persist: boolean) => {
      if (!password || busy.value) return;
      busy.value = true;
      failed.value = false;
      try {
        html.value = await decryptPayload(password, payload.value);
        cachedPassword = password;
        if (persist) localStorage.setItem(LOCAL_KEY, password);
        else sessionStorage.setItem(SESSION_KEY, password);
      } catch {
        failed.value = true;
      } finally {
        busy.value = false;
      }
    };

    onMounted(() => {
      const stored =
        sessionStorage.getItem(SESSION_KEY) ??
        localStorage.getItem(LOCAL_KEY) ??
        cachedPassword;
      if (stored) void unlock(stored, false);
    });

    const submit = () => void unlock(input.value, remember.value);

    const renderForm = () =>
      h(
        "div",
        { style: "display:flex;justify-content:center;padding:32px 0;" },
        [
          h(
            "div",
            {
              style: `width:100%;max-width:360px;border:${INPUT_BORDER};border-radius:12px;padding:24px;text-align:center;box-sizing:border-box;`,
            },
            [
              h(
                "div",
                { style: "font-size:14px;font-weight:500;margin-bottom:6px;" },
                "该页面内容已加密"
              ),
              h(
                "div",
                { style: "font-size:12px;opacity:0.7;margin-bottom:16px;" },
                "请输入访问口令以查看正文"
              ),
              h("input", {
                type: "password",
                value: input.value,
                placeholder: "访问口令",
                autocomplete: "off",
                style: `width:100%;padding:10px 12px;border:${INPUT_BORDER};border-radius:8px;font-size:14px;box-sizing:border-box;background:transparent;color:inherit;outline:none;`,
                onInput: (event: Event) => {
                  input.value = (event.target as HTMLInputElement).value;
                  failed.value = false;
                },
                onKeydown: (event: KeyboardEvent) => {
                  if (event.key === "Enter") submit();
                },
              }),
              h(
                "label",
                {
                  style:
                    "display:flex;align-items:center;gap:6px;margin-top:12px;font-size:12px;opacity:0.8;cursor:pointer;",
                },
                [
                  h("input", {
                    type: "checkbox",
                    checked: remember.value,
                    onChange: (event: Event) => {
                      remember.value = (event.target as HTMLInputElement).checked;
                    },
                  }),
                  "记住密码",
                ]
              ),
              h(
                "button",
                {
                  type: "button",
                  disabled: busy.value,
                  style:
                    "width:100%;margin-top:16px;padding:10px;border:none;border-radius:8px;background:#3eaf7c;color:#fff;font-size:14px;cursor:pointer;",
                  onClick: submit,
                },
                busy.value ? "解密中…" : "解锁"
              ),
              h(
                "div",
                {
                  style:
                    "min-height:18px;margin-top:10px;font-size:12px;color:#e5484d;",
                },
                failed.value ? "口令不正确" : ""
              ),
            ]
          ),
        ]
      );

    return () => {
      if (html.value) {
        return h("div", { class: "encrypted-content", innerHTML: html.value });
      }
      return renderForm();
    };
  },
});

export default defineClientConfig({
  enhance({ app }) {
    app.component("EncryptedContent", EncryptedContent);
  },
  setup() {
    const route = useRoute();

    let stopTyping: (() => void) | null = null;
    let retryTimer = 0;
    let stopWatch: (() => void) | undefined;

    /** 轮询等待 Hero 渲染完成后再启动动画（页面 chunk 可能异步加载） */
    const startWithRetry = () => {
      stopTyping?.();
      stopTyping = null;
      window.clearInterval(retryTimer);

      let attempts = 0;
      retryTimer = window.setInterval(() => {
        if (++attempts > 25) {
          window.clearInterval(retryTimer);
          return;
        }
        stopTyping = startTypingEffect();
        if (stopTyping) window.clearInterval(retryTimer);
      }, 200);
    };

    onMounted(() => {
      startWithRetry();
      injectFooter();

      // SPA 路由切换：离开首页时停止动画，回到首页时重新启动
      stopWatch = watch(
        () => route.path,
        (path) => {
          if (path === "/" || path === "/index.html") {
            startWithRetry();
          } else {
            window.clearInterval(retryTimer);
            stopTyping?.();
            stopTyping = null;
          }
        }
      );
    });

    onUnmounted(() => {
      stopWatch?.();
      window.clearInterval(retryTimer);
      stopTyping?.();
    });
  },
});

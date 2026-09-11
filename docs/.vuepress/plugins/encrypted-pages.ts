import { createCipheriv, pbkdf2Sync, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { logger } from "vuepress/utils";

import type { Plugin } from "vuepress";

/**
 * PBKDF2-SHA256 迭代次数，必须与客户端 docs/.vuepress/client.ts 中的取值一致。
 * 取值同时影响构建耗时与解锁耗时，调大更抗爆破、但解锁更慢。
 */
const ITERATIONS = 600_000;

/** 密钥派生输出长度（AES-256） */
const KEY_LENGTH = 32;

/** 文件头的 frontmatter 区块，原样保留，避免重排 YAML */
const FRONTMATTER_RE = /^(---\r?\n[\s\S]*?\r?\n---\r?\n)/;

/** 客户端组件名，需与 client.ts 中注册的名字一致 */
const COMPONENT_NAME = "EncryptedContent";

interface EncryptedPagesOptions {
  /** 明文口令，仅存在于构建环境（本地 .env / CI Secret） */
  password: string;
  /** 受保护目录，相对于 docs 源目录 */
  dir: string;
}

/**
 * 把受保护目录下的页面正文替换为密文。
 *
 * 时机选在 `extendsPageOptions`：该钩子在页面正文被读取与编译之前执行，
 * 且 `options.content` 一旦是字符串就会被直接采用（见 @vuepress/core 的
 * resolvePageContent）。因此在这里覆写，明文正文根本不会进入编译产物。
 *
 * 正文先按主题的 markdown 配置渲染成 HTML，再用口令派生的密钥做 AES-256-GCM
 * 加密；页面里只留下 base64 密文与 KDF 参数，由客户端组件用同一口令解密渲染。
 */
export const encryptedPagesPlugin = ({
  password,
  dir,
}: EncryptedPagesOptions): Plugin => {
  const encryptedFiles: string[] = [];

  const encrypt = (plain: string): string => {
    const salt = randomBytes(16);
    const iv = randomBytes(12);
    const key = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, "sha256");
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    // GCM 的认证标签追加在密文末尾，WebCrypto 解密时按同样的布局读取
    const ciphertext = Buffer.concat([
      cipher.update(plain, "utf-8"),
      cipher.final(),
      cipher.getAuthTag(),
    ]);

    return Buffer.from(
      JSON.stringify({
        i: ITERATIONS,
        s: salt.toString("base64"),
        v: iv.toString("base64"),
        c: ciphertext.toString("base64"),
      }),
    ).toString("base64");
  };

  return {
    name: "encrypted-pages",

    // 解密组件的注册写在 docs/.vuepress/client.ts —— 该文件由 @vuepress/cli 自动加载

    extendsPageOptions(options, app) {
      const filePath = options.filePath;
      if (!filePath) return;

      const relativePath = path
        .relative(app.dir.source(), filePath)
        .split(path.sep)
        .join("/");
      if (!relativePath.startsWith(`${dir}/`)) return;

      const raw = readFileSync(filePath, "utf-8");
      const matched = raw.match(FRONTMATTER_RE);
      const frontmatter = matched ? matched[0] : "";
      const body = matched ? raw.slice(matched[0].length) : raw;

      const html = app.markdown.render(body, {
        base: app.options.base,
        filePath,
        filePathRelative: relativePath,
        frontmatter: {},
      });

      options.content = `${frontmatter}
<${COMPONENT_NAME} payload="${encrypt(html)}" />
`;

      encryptedFiles.push(relativePath);
    },

    onGenerated(app) {
      if (encryptedFiles.length > 0) {
        logger.info(
          `encrypted-pages: 已加密 ${encryptedFiles.length} 个页面（产物中只保留密文）：\n  ${encryptedFiles.join("\n  ")}`,
        );
      }
    },
  };
};

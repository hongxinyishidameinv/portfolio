/* =========================================================
 * 个人网站交互逻辑
 * 负责：渲染个人名片、导航切换、各栏目内容渲染、
 *       项目视频悬停播放 / 触屏控制、简历下载等。
 * ========================================================= */

(function () {
  "use strict";

  const DATA = window.SITE_DATA;

  const NAV_ITEMS = [
    { key: "intro", label: "个人介绍" },
    { key: "campus", label: "校园经历" },
    { key: "internship", label: "实习经历" },
    { key: "projects", label: "项目经历" },
    { key: "skills", label: "证书与荣誉" },
  ];

  let currentSection = "intro";
  const revealedCards = new Set();
  const activeAnimations = new Set();
  let cardObserver = null;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function clearMotion() {
    if (cardObserver) cardObserver.disconnect();
    cardObserver = null;
    activeAnimations.forEach((animation) => animation.cancel());
    activeAnimations.clear();
  }

  reducedMotion.addEventListener("change", (event) => {
    if (event.matches) clearMotion();
  });

  function animateEntrance(element, duration, offset, delay = 0) {
    if (reducedMotion.matches || typeof element.animate !== "function") return false;
    try {
      const animation = element.animate([
        { opacity: 0, transform: `translateY(${offset}px)` },
        { opacity: 1, transform: "translateY(0)" },
      ], { duration, delay, easing: "ease-out", fill: "backwards" });
      activeAnimations.add(animation);
      animation.onfinish = animation.oncancel = () => activeAnimations.delete(animation);
      return true;
    } catch (error) {
      return false; // Contents remain visible if animation initialization fails.
    }
  }

  function initializeMotion(content) {
    animateEntrance(content, 500, 6);
    if (reducedMotion.matches || !("IntersectionObserver" in window)) return;
    const section = currentSection;
    const cards = [...content.querySelectorAll(".skill-card-entry, .timeline-item, .project-card-entry, .honor-card")];
    const keys = new Map(cards.map((card, index) => [card, `${section}:${index}`]));
    try {
      cardObserver = new IntersectionObserver((entries) => {
        let stagger = 0;
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const key = keys.get(entry.target);
          if (!revealedCards.has(key)) {
            if (animateEntrance(entry.target, 550, 8, Math.min(stagger++ * 50, 200))) {
              revealedCards.add(key);
              entry.target.classList.add("is-revealed");
            }
          }
          cardObserver?.unobserve(entry.target);
        });
      }, { threshold: 0 });
      cards.forEach((card) => {
        if (!revealedCards.has(keys.get(card))) cardObserver.observe(card);
      });
    } catch (error) {
      if (cardObserver) cardObserver.disconnect();
      cardObserver = null;
    }
  }

  /* ---------- 工具函数 ---------- */
  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function el(html) {
    const tpl = document.createElement("template");
    tpl.innerHTML = html.trim();
    return tpl.content.firstElementChild;
  }

  /* ---------- 渲染顶部个人名片 ---------- */
  function renderProfile() {
    const p = DATA.profile;

    // 姓名：逐字拆分为 span，模糊上浮入场；配合 CSS 流光波纹
    const nameEl = document.getElementById("profileName");
    nameEl.textContent = "";
    [...p.name].forEach((ch, i) => {
      const span = document.createElement("span");
      span.className = "name-char";
      span.textContent = ch;
      // 负延迟让每个字流光相位错开，形成左→右的光波
      span.style.animationDelay = `${(-i * 0.4).toFixed(2)}s`;
      nameEl.appendChild(span);
      if (!reducedMotion.matches && typeof span.animate === "function") {
        try {
          const anim = span.animate([
            { opacity: 0, transform: "translateY(12px)", filter: "blur(6px)" },
            { opacity: 1, transform: "translateY(0)", filter: "blur(0)" },
          ], { duration: 600, delay: 120 + i * 90, easing: "ease-out", fill: "backwards" });
          activeAnimations.add(anim);
          anim.onfinish = anim.oncancel = () => activeAnimations.delete(anim);
        } catch (e) {
          /* 动画初始化失败时文字保持可见 */
        }
      }
    });

    // 第一行：学校 · 专业 · 届别
    document.getElementById("profileRow1").textContent =
      [p.school, p.major, p.grade].filter(Boolean).join(" · ");

    // 第二行：学业表现 · 政治面貌
    document.getElementById("profileRow2").textContent =
      [p.academic, p.political].filter(Boolean).join(" · ");

    // 第三行：电话（带 +86 前缀展示）
    const phoneEl = document.getElementById("profilePhone");
    if (p.phone) {
      phoneEl.textContent = `(+86) ${p.phone}`;
      phoneEl.style.display = "";
    } else {
      phoneEl.style.display = "none";
    }

    // 第四行：邮箱
    const emailEl = document.getElementById("profileEmail");
    if (p.email) {
      emailEl.textContent = p.email;
      emailEl.style.display = "";
    } else {
      emailEl.style.display = "none";
    }

    // 头像
    const avatar = document.getElementById("avatar");
    avatar.innerHTML = "";
    if (p.avatarPath) {
      const img = document.createElement("img");
      img.src = p.avatarPath;
      img.alt = `${p.name}的个人照片`;
      img.onerror = function () {
        avatar.replaceChildren();
      };
      avatar.appendChild(img);
    } else {
      avatar.replaceChildren();
    }

    // 简历下载
    const resumeBtn = document.getElementById("resumeBtn");
    if (p.resumePath) {
      resumeBtn.href = p.resumePath;
      resumeBtn.setAttribute("download", "");
      resumeBtn.textContent = "下载简历";
      resumeBtn.removeAttribute("disabled");
      resumeBtn.setAttribute("aria-disabled", "false");
    } else {
      resumeBtn.removeAttribute("href");
      resumeBtn.removeAttribute("download");
      resumeBtn.textContent = "简历待上传";
      resumeBtn.setAttribute("disabled", "true");
      resumeBtn.setAttribute("aria-disabled", "true");
    }
  }

  /* ---------- 渲染导航 ---------- */
  function renderNav() {
    const list = document.getElementById("navList");
    list.innerHTML = "";
    NAV_ITEMS.forEach((item) => {
      const li = document.createElement("li");
      li.className = "nav-item" + (item.key === currentSection ? " active" : "");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = item.label;
      if (item.key === currentSection) {
        btn.setAttribute("aria-current", "page");
      } else {
        btn.removeAttribute("aria-current");
      }
      btn.addEventListener("click", () => switchSection(item.key));
      li.appendChild(btn);
      list.appendChild(li);
    });
  }

  /* ---------- 切换栏目 ---------- */
  function switchSection(key) {
    if (currentSection === key) return;
    // 切换前停止所有正在播放的项目视频
    stopAllVideos();
    currentSection = key;
    renderNav();
    renderContent();
    const content = document.getElementById("content");
    // 让内容区可被辅助技术聚焦
    content.focus({ preventScroll: false });
  }

  /* ---------- 停止所有视频播放并恢复封面 ---------- */
  function stopAllVideos() {
    const videos = document.querySelectorAll(".project-video video");
    videos.forEach((video) => {
      try {
        video.pause();
        video.currentTime = 0;
      } catch (e) {
        /* 忽略 */
      }
    });
    const covers = document.querySelectorAll(".video-cover");
    covers.forEach((cover) => {
      cover.style.display = "flex";
    });
  }

  /* ---------- 渲染内容区 ---------- */
  function renderContent() {
    clearMotion();
    const content = document.getElementById("content");
    const sectionMeta = DATA.sections[currentSection];
    let html = `<h2 class="section-title">${escapeHtml(sectionMeta.title)}</h2>`;
    if (sectionMeta.description) {
      html += `<p class="section-desc">${escapeHtml(sectionMeta.description)}</p>`;
    }

    switch (currentSection) {
      case "intro":
        html += renderIntro();
        break;
      case "campus":
        html += renderExperienceCards(DATA.campus);
        break;
      case "internship":
        html += renderExperienceCards(DATA.internship, true);
        break;
      case "projects":
        html += renderProjects();
        break;
      case "skills":
        html += renderSkills();
        break;
    }
    content.innerHTML = html;

    // 项目视频交互绑定
    if (currentSection === "projects") {
      bindProjectVideos();
      bindProofPreviews();
    }
    if (currentSection === "skills") bindProofPreviews();
    initializeMotion(content);
  }

  /* ---------- 个人介绍 ---------- */
  function renderIntro() {
    const data = DATA.intro;
    let html = "";

    // 技能特长：三张简洁卡片
    if (data.skills && data.skills.length) {
      html += '<h3 class="block-title">技能特长</h3>';
      html += '<div class="skill-cards">';
      data.skills.forEach((s) => {
        html += `<div class="skill-card-entry"><div class="skill-card">
                   <h4 class="skill-card-title">${escapeHtml(s.title)}</h4>
                   <div class="skill-card-desc">${(s.paragraphs || s.items || (s.desc ? [s.desc] : [])).map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\b(SQL|Excel|CDA|YOLO|ONNX)\b/g, "<strong>$1</strong>")}</p>`).join("")}</div>
                 </div></div>`;
      });
      html += "</div>";
    }

    // 自我评价：合为连续段落，按容器宽度自然换行
    if (data.selfEval) {
      html += '<h3 class="block-title">自我评价</h3>';
      const paragraphs = Array.isArray(data.selfEval) ? data.selfEval : [data.selfEval];
      html += `<div class="self-eval"><p>${escapeHtml(paragraphs.join(""))}</p></div>`;
    }

    return html;
  }

  /* ---------- 校园与实习经历：时间线与完整内容卡片 ---------- */
  function renderExperienceCards(items, isInternship = false) {
    if (!items || !items.length) {
      return '<p class="section-desc">暂无经历（待补充）。</p>';
    }
    const formatText = (text) => escapeHtml(text).replace(
      /10余场|800余名|百余份|80余名|上万条|200\+位|6类|4类|20\+份|30\+次/g,
      "<strong>$&</strong>"
    );
    return `<div class="timeline campus-timeline">${items.map((item) => `
      <div class="timeline-item">
        <article class="campus-card">
          <header class="campus-card-header${isInternship ? " internship-card-header" : ""}">
            <h3 class="campus-role">${escapeHtml(isInternship ? item.org : item.role)}</h3>
            ${isInternship ? `<p class="experience-position">${escapeHtml(item.role)}</p>` : ""}
            <span class="campus-time">${escapeHtml(item.time)}</span>
          </header>
          <p class="campus-summary">${formatText(item.summary)}</p>
          ${(item.blocks || []).map((block) => `
            <section class="campus-block">
              <h4>${escapeHtml(block.title)}</h4>
              <p>${formatText(block.text)}</p>
            </section>`).join("")}
        </article>
      </div>`).join("")}</div>`;
  }

  /* ---------- 项目经历 ---------- */
  function renderProjects() {
    const projects = DATA.projects || [];
    if (!projects.length) {
      return '<p class="section-desc">暂无项目（待补充）。</p>';
    }
    let html = '<div class="projects-grid">';
    projects.forEach((proj, idx) => {
      html += renderProjectCard(proj, idx);
    });
    html += "</div>";
    return html;
  }

  function renderProjectCard(proj, idx) {
    const formatText = (text) => escapeHtml(text).replace(/三类角色|13张数据表|软件著作权|2MB以内/g, "<strong>$&</strong>");
    const hasVideo = !!proj.video;
    const portrait = proj.mediaType === "portrait";
    const coverStyle = proj.videoCover
      ? `style="background-image:url('${escapeHtml(proj.videoCover)}')"`
      : "";

    const coverInner = hasVideo
      ? `<span class="cover-hint">悬停播放演示</span>`
      : `<span class="cover-placeholder">${portrait ? "竖屏演示视频待上传" : "演示视频待上传"}</span>`;

    let videoHtml = "";
    if (hasVideo) {
      // preload="none"，初始不加载视频
      videoHtml = `<video muted playsinline loop preload="${proj.videoCover ? "none" : "auto"}"></video>`;
    }

    const liveLabel = proj.liveLabel || "在线体验";
    const liveBtn = proj.liveUrl
      ? `<a class="btn btn-primary" href="${escapeHtml(proj.liveUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(liveLabel)}<span class="project-link-arrow" aria-hidden="true"></span></a>`
      : `<button class="btn btn-primary" type="button" disabled aria-disabled="true">体验链接待添加</button>`;

    return `<div class="project-card-entry"><article class="project-card">
      <header class="project-header">
        <h3 class="project-title">${escapeHtml(proj.title)}</h3>
        <span class="project-time">${escapeHtml(proj.time)}</span>
        ${proj.role ? `<span class="project-role">${escapeHtml(proj.role)}</span>` : ""}
      </header>
      <div class="project-media">
      ${portrait ? "" : proj.image ? `<button class="project-image" type="button" data-proof-image="${escapeHtml(proj.image)}" data-proof-title="${escapeHtml(proj.title)}项目图片" aria-label="查看${escapeHtml(proj.title)}项目图片大图"><img src="${escapeHtml(proj.image)}" alt="${escapeHtml(proj.title)}项目界面" loading="lazy"></button>` : `<div class="project-image project-image-placeholder">项目图片待上传</div>`}
      <div class="project-video${portrait ? " project-video-portrait" : ""}" data-project-index="${idx}">
        ${videoHtml}
        <div class="video-cover${hasVideo && !proj.videoCover ? " video-cover-first-frame" : ""}" ${coverStyle}>
          ${coverInner}
        </div>
        <div class="video-error" role="alert">视频播放失败，请检查网络或文件。</div>
        ${hasVideo ? `<div class="video-controls">
          <button class="btn" type="button" data-action="play">播放</button>
          <button class="btn" type="button" data-action="pause">暂停</button>
        </div>` : ""}
      </div>
      </div>
      <div class="project-body">
        <div class="project-block"><h4>项目简介</h4>
          <p class="project-summary">${formatText(proj.summary)}</p>
        </div>
        <div class="project-block">
          <h4>核心功能</h4>
          <ul>${(proj.features || []).map((feature) => `<li>${formatText(feature)}</li>`).join("")}</ul>
        </div>
        <div class="project-block">
          <h4>${escapeHtml(proj.developmentTitle)}</h4>
          <p>${formatText(proj.development)}</p>
        </div>
        <div class="project-actions">
          <div class="project-tags">
            ${(proj.tags || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
          </div>
          <div class="project-footer">${liveBtn}</div>
          ${proj.demoNote ? `<p class="project-demo-note">${escapeHtml(proj.demoNote)}</p>` : ""}
        </div>
      </div>
    </article></div>`;
  }

  /* ---------- 证书与荣誉 ---------- */
  function renderSkills() {
    const data = DATA.skills || {};
    const campusHonors = [
      data.scholarship,
      ...["社会实践先进个人", "优秀共青团干部", "优秀共青团员", "三好学生"]
        .map((name) => data.honors.find((item) => item.name === name)).filter(Boolean),
    ];
    return `
      <section class="honor-section">
        <h3 class="block-title">学科竞赛与创新项目</h3>
        <div class="honor-grid competition-grid">${data.competitions.map((item) => `
          <article class="honor-card"><h4>${escapeHtml(item.name)}</h4>
            ${item.category ? `<p class="honor-category innovation-label">${escapeHtml(item.category)}</p>` : ""}
            <p class="honor-highlight">${escapeHtml(item.award)}</p>
            <p class="honor-meta">${escapeHtml(item.time)}</p>${renderProof(item)}
          </article>`).join("")}</div>
      </section>
      <section class="honor-section">
        <h3 class="block-title">科研成果</h3>
        <div class="research-grid">${data.research.map((item) => `
          <article class="honor-card"><p class="honor-category">${escapeHtml(item.category)}</p>
            <h4>${escapeHtml(item.name)}</h4><p class="honor-highlight">${escapeHtml(item.status)}</p>
            ${item.time ? `<p class="honor-meta">${escapeHtml(item.timeLabel || "时间")}：${escapeHtml(item.time)}</p>` : ""}
            ${item.details.map((detail) => `<p class="honor-meta">${escapeHtml(detail.label)}：${escapeHtml(detail.value)}</p>`).join("")}
            ${renderProof(item)}
          </article>`).join("")}</div>
      </section>
      <section class="honor-section">
        <h3 class="block-title">校园荣誉</h3>
        <ul class="campus-honor-list">${campusHonors.map((item) => `
          <li><div class="honor-record campus-honor-row"><strong>${escapeHtml(item.name)}</strong><span class="campus-honor-time">${escapeHtml(item.count || item.time)}</span></div>${renderProof(item)}</li>
        `).join("")}</ul>
      </section>
      <section class="honor-section">
        <h3 class="block-title">专业证书</h3>
        <div class="honor-grid">${data.certificates.map((item) => `
          <article class="honor-card"><h4>${escapeHtml(item.name)}</h4>
            <p class="honor-meta">${escapeHtml(item.time)}</p>${renderProof(item)}
          </article>`).join("")}</div>
      </section>`;
  }

  function renderProof(item) {
    const proof = item.proof;
    if (!proof || !proof.path) return "";
    // Only local relative paths and HTTP(S) resources are valid proof sources.
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(proof.path) && !/^https?:\/\//i.test(proof.path)) return "";
    if (proof.type === "image") {
      return `<button class="btn btn-ghost proof-button" type="button" data-proof-image="${escapeHtml(proof.path)}" data-proof-title="${escapeHtml(item.name)}">查看证明</button>`;
    }
    return `<a class="btn btn-ghost proof-button" href="${escapeHtml(proof.path)}" target="_blank" rel="noopener noreferrer">查看证明</a>`;
  }

  function bindProofPreviews() {
    document.querySelectorAll("[data-proof-image]").forEach((button) => {
      button.addEventListener("click", () => {
        const dialog = document.createElement("dialog");
        dialog.className = "proof-dialog";
        dialog.setAttribute("aria-label", `${button.dataset.proofTitle}证明材料`);
        const close = document.createElement("button");
        close.type = "button";
        close.className = "btn proof-close";
        close.textContent = "关闭";
        const img = document.createElement("img");
        img.src = button.dataset.proofImage;
        img.alt = `${button.dataset.proofTitle}证明材料`;
        close.addEventListener("click", () => dialog.close());
        dialog.addEventListener("click", (event) => {
          const bounds = dialog.getBoundingClientRect();
          if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
        });
        // Native modal dialog handles Esc and keeps focus inside the preview.
        dialog.addEventListener("close", () => { dialog.remove(); button.focus(); });
        dialog.appendChild(close);
        dialog.appendChild(img);
        document.body.appendChild(dialog);
        dialog.showModal();
        close.focus();
      });
    });
  }

  /* ---------- 项目视频交互 ---------- */
  function bindProjectVideos() {
    const containers = document.querySelectorAll(".project-video[data-project-index]");
    containers.forEach((container) => {
      const idx = parseInt(container.getAttribute("data-project-index"), 10);
      const proj = DATA.projects[idx];
      if (!proj || !proj.video) return; // 无视频时不绑定播放逻辑

      const video = container.querySelector("video");
      const cover = container.querySelector(".video-cover");
      const errorEl = container.querySelector(".video-error");
      if (!video || !cover) return;

      let isActive = false; // 是否处于"需要播放"的状态（鼠标悬停或触屏点了播放）
      let errorTimer = null;

      function showCover() {
        cover.style.display = "flex";
      }
      function hideCover() {
        cover.style.display = "none";
      }
      function showError() {
        errorEl.style.display = "block";
        if (errorTimer) clearTimeout(errorTimer);
        errorTimer = setTimeout(() => {
          errorEl.style.display = "none";
        }, 3000);
      }
      function hideError() {
        errorEl.style.display = "none";
      }

      // 确保视频源已设置（懒加载）
      function ensureSource() {
        if (!video.getAttribute("src")) {
          video.src = proj.video;
        }
      }

      video.addEventListener("loadedmetadata", () => {
        if (proj.mediaType === "portrait" && video.videoWidth && video.videoHeight) {
          container.style.aspectRatio = `${video.videoWidth} / ${video.videoHeight}`;
        }
      });
      // Without a supplied cover, load only an existing configured video to show its first frame.
      if (!proj.videoCover) ensureSource();

      // 尝试播放
      function play() {
        isActive = true;
        ensureSource();
        // 从头开始
        try {
          video.currentTime = 0;
        } catch (e) {
          /* 忽略 currentTime 异常 */
        }
        hideError();
        const p = video.play();
        if (p && typeof p.then === "function") {
          p.then(() => {
            // 播放成功后，如果已不再需要播放（例如鼠标已离开），立即停止
            if (!isActive) {
              video.pause();
              try {
                video.currentTime = 0;
              } catch (e) {}
              showCover();
            }
          }).catch(() => {
            // 浏览器拒绝播放（如未交互、自动播放策略）
            if (isActive) {
              showError();
              showCover();
            }
          });
        }
        hideCover();
      }

      // 停止播放并恢复封面
      function stop() {
        isActive = false;
        video.pause();
        try {
          video.currentTime = 0;
        } catch (e) {}
        showCover();
        hideError();
      }

      // 桌面端：鼠标悬停播放
      container.addEventListener("mouseenter", play);
      container.addEventListener("mouseleave", stop);

      // 触屏端：播放 / 暂停按钮
      const playBtn = container.querySelector('[data-action="play"]');
      const pauseBtn = container.querySelector('[data-action="pause"]');
      if (playBtn) {
        playBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          play();
        });
      }
      if (pauseBtn) {
        pauseBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          stop();
        });
      }

      // 视频自然结束时恢复封面（非循环场景，虽然设了 loop，此处作为兜底）
      video.addEventListener("ended", () => {
        if (!isActive) showCover();
      });
    });
  }

  /* ---------- 初始化 ---------- */
  function init() {
    renderProfile();
    renderNav();
    renderContent();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

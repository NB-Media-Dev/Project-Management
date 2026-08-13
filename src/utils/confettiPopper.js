function safeRandom() {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] / (0xffffffff + 1);
}

export function triggerPopperBlast() {
  try {
    const existing = document.getElementById('pm-popper-canvas');
    existing?.remove();
  } catch { }

  const canvas = document.createElement('canvas');
  canvas.id = 'pm-popper-canvas';
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '999999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const width = (canvas.width = window.innerWidth || document.documentElement.clientWidth || 800);
  const height = (canvas.height = window.innerHeight || document.documentElement.clientHeight || 600);

  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4',
    '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
    '#ffd700', '#00ffcc', '#ff007f'
  ];

  const particles = [];
  const particleCount = 210;

  // Launch particles from bottom left, center, and right
  const launchPoints = [
    { x: width * 0.15, y: height * 0.9 },
    { x: width * 0.5, y: height * 0.85 },
    { x: width * 0.85, y: height * 0.9 },
  ];


  launchPoints.forEach((point) => {
    for (let i = 0; i < particleCount / 3; i++) {
      const angle = (safeRandom() * -Math.PI) * 0.85 - Math.PI * 0.075;
      const speed = safeRandom() * 24 + 12;
      const shapeRoll = safeRandom();
      let shape = 'star';
      if (shapeRoll > 0.4) {
        shape = 'rect';
      } else if (safeRandom() > 0.5) {
        shape = 'circle';
      }
      particles.push({
        x: point.x,
        y: point.y,
        vx: Math.cos(angle) * speed + (safeRandom() * 4 - 2),
        vy: Math.sin(angle) * speed,
        size: safeRandom() * 10 + 6,
        color: colors[Math.floor(safeRandom() * colors.length)],
        rotation: safeRandom() * Math.PI * 2,
        rotationSpeed: (safeRandom() - 0.5) * 0.25,
        opacity: 1,
        friction: 0.96,
        gravity: 0.45,
        shape,
      });
    }
  });

  const startTime = Date.now();

  function drawStar(cx, cy, spikes, outerRadius, innerRadius, color) {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    let activeCount = 0;

    particles.forEach((p) => {
      if (p.opacity <= 0) return;
      activeCount++;

      p.vx *= p.friction;
      p.vy *= p.friction;
      p.vy += p.gravity;

      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      p.opacity -= 0.007;

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      if (p.shape === 'rect') {
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      } else if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      } else {
        drawStar(0, 0, 5, p.size, p.size / 2, p.color);
      }

      ctx.restore();
    });

    if (activeCount > 0 && Date.now() - startTime < 5000) {
      requestAnimationFrame(render);
    } else {
      ctx.clearRect(0, 0, width, height);
      canvas.remove();
    }
  }

  render();
}

export function showCelebrationBanner(packageList) {
  try {
    const existing = document.getElementById('pm-celebration-banner');
    existing?.remove();
  } catch { }

  if (!packageList || !Array.isArray(packageList) || packageList.length === 0) return;

  const container = document.createElement('div');
  container.id = 'pm-celebration-banner';
  container.style.position = 'fixed';
  container.style.top = '28px';
  container.style.left = '50%';
  container.style.transform = 'translate(-50%, -12px)';
  container.style.zIndex = '9999999';
  container.style.width = 'calc(100% - 32px)';
  container.style.maxWidth = '560px';
  container.style.opacity = '0';
  container.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
  container.style.pointerEvents = 'none';

  const packageNames = packageList
    .map((p) => (p.name && p.name !== 'Task' ? p.name : 'Task'))
    .join(' & ');
  const projectName = packageList[0]?.project ? packageList[0].project : 'Project';

  container.innerHTML = `
    <div style="
      background: rgba(255, 255, 255, 0.96);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(226, 232, 240, 0.95);
      border-radius: 18px;
      padding: 18px 24px;
      box-shadow: 0 20px 40px -10px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(255, 255, 255, 0.8);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 10px;
      font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      user-select: none;
    ">
      <div style="
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: #f0f9ff;
        border: 1px solid #bae6fd;
        color: #0284c7;
        padding: 4px 14px;
        border-radius: 9999px;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      ">
        <span style="width: 6px; height: 6px; border-radius: 50%; background: #0284c7; display: inline-block;"></span>
        Production Release Deployed
      </div>

      <h2 style="
        margin: 0;
        font-size: 1.35rem;
        font-weight: 800;
        color: #0f172a;
        letter-spacing: -0.02em;
        line-height: 1.25;
      ">
        ${packageNames}
      </h2>

      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.83rem;
        color: #64748b;
        font-weight: 500;
      ">
        <span>Project: <strong style="color: #334155; font-weight: 600;">${projectName}</strong></span>
        <span style="color: #cbd5e1;">•</span>
        <span style="color: #10b981; font-weight: 600;">Live in Production</span>
      </div>
    </div>
  `;

  const targetContainer = document.querySelector('.playful-shell') || document.querySelector('.app-shell') || document.body;
  targetContainer.appendChild(container);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      container.style.opacity = '1';
      container.style.transform = 'translate(-50%, 0)';
    });
  });

  setTimeout(() => {
    container.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
    container.style.opacity = '0';
    container.style.transform = 'translate(-50%, -10px)';
    setTimeout(() => {
      container.remove();
    }, 400);
  }, 4000);
}

export function markDeploymentAsSeen(packageId, username) {
  if (packageId === undefined || packageId === null) return;
  const cleanUser = (username || 'user').toString().trim().toLowerCase();
  const userKey = `pm_seen_deployments_${cleanUser}`;
  try {
    let seen = [];
    const raw = localStorage.getItem(userKey);
    if (raw) seen = JSON.parse(raw);
    const strId = String(packageId);
    if (!seen.map(String).includes(strId)) {
      seen.push(strId);
      localStorage.setItem(userKey, JSON.stringify(seen));
    }
  } catch { }
}

export function broadcastPopperBlast(packageId, username, packageName, project) {
  triggerPopperBlast();

  const pkgInfo = {
    id: String(packageId),
    name: packageName || 'Task',
    project: project || 'Project',
  };

  showCelebrationBanner([pkgInfo]);

  if (packageId !== undefined && packageId !== null) {
    markDeploymentAsSeen(packageId, username);
  }

  const payload = {
    packageId: String(packageId),
    packageName: packageName || 'Task',
    project: project || 'Project',
    timestamp: Date.now(),
    nonce: safeRandom().toString(),
  };

  try {
    localStorage.setItem('pm_popper_blast_event', JSON.stringify(payload));
  } catch { }

  window.dispatchEvent(
    new CustomEvent('pm_popper_blast', { detail: payload })
  );
}

export function checkUnseenDeployments(packages, username) {
  if (!packages || !Array.isArray(packages) || packages.length === 0) return;
  const cleanUser = (username || 'user').toString().trim().toLowerCase();
  const userKey = `pm_seen_deployments_${cleanUser}`;
  let seen = [];
  try {
    const raw = localStorage.getItem(userKey);
    if (raw) seen = JSON.parse(raw);
  } catch {
    seen = [];
  }

  const seenStrings = seen.map(String);
  const unseenDeployed = packages.filter((p) => {
    const isDeployed = Boolean(p.deployed === true || p.deployed === 1 || p.deployed === '1');
    return isDeployed && !seenStrings.includes(String(p.id));
  });

  if (unseenDeployed.length > 0) {
    setTimeout(() => {
      triggerPopperBlast();
      showCelebrationBanner(unseenDeployed.map((p) => ({
        id: String(p.id),
        name: p.name || 'Task',
        project: p.project || 'Project',
      })));
    }, 600);

    const newSeen = Array.from(new Set([...seenStrings, ...unseenDeployed.map((p) => String(p.id))]));
    try {
      localStorage.setItem(userKey, JSON.stringify(newSeen));
    } catch { }
  }
}

export function initGlobalPopperListener(username, packagesList) {
  const resolvePackageInfo = (packageId, fallbackName, fallbackProject) => {
    if (packagesList && Array.isArray(packagesList) && packageId) {
      const found = packagesList.find((p) => String(p.id) === String(packageId));
      if (found) {
        return {
          id: String(found.id),
          name: found.name || fallbackName || 'Task',
          project: found.project || fallbackProject || 'Project',
        };
      }
    }
    return {
      id: String(packageId || ''),
      name: fallbackName || 'Task',
      project: fallbackProject || 'Project',
    };
  };

  const handleStorageChange = (e) => {
    if (e.key === 'pm_popper_blast_event' && e.newValue) {
      let pkgInfoList = [];
      try {
        const data = JSON.parse(e.newValue);
        if (data?.packageId) {
          markDeploymentAsSeen(data.packageId, username);
          pkgInfoList = [resolvePackageInfo(data.packageId, data.packageName, data.project)];
        }
      } catch { }
      triggerPopperBlast();
      if (pkgInfoList.length > 0) showCelebrationBanner(pkgInfoList);
    }
  };

  const handleCustomEvent = (e) => {
    let pkgInfoList = [];
    if (e?.detail?.packageId) {
      markDeploymentAsSeen(e.detail.packageId, username);
      pkgInfoList = [resolvePackageInfo(e.detail.packageId, e.detail.packageName, e.detail.project)];
    }
    triggerPopperBlast();
    if (pkgInfoList.length > 0) showCelebrationBanner(pkgInfoList);
  };

  window.addEventListener('storage', handleStorageChange);
  window.addEventListener('pm_popper_blast', handleCustomEvent);

  return () => {
    window.removeEventListener('storage', handleStorageChange);
    window.removeEventListener('pm_popper_blast', handleCustomEvent);
  };
}

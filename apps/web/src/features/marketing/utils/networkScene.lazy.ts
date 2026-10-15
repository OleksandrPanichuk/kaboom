import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  LineBasicMaterial,
  LineSegments,
  MathUtils,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector3,
  WebGLRenderer,
} from "three";

export interface NetworkScene {
  setScroll(progress: number): void;
  dispose(): void;
}

export interface NetworkSceneOptions {
  reducedMotion: boolean;
  onFirstFrame?: () => void;
}

const NODE_COUNT = 96;
const PACKET_COUNT = 72;
const NEIGHBOURS = 2;
const MAX_LINK = 3.4;
const CAMERA_Z = 16;
const MAX_PIXEL_RATIO = 2;

const EMBER = new Color("#e8693f");
const STEEL = new Color("#6f7fa3");
const GLOW = new Color("#f5d6c8");

const VERTEX = `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uScale;
  attribute float size;
  attribute float phase;
  attribute vec3 color;
  varying vec3 vColor;
  varying float vDepth;

  void main() {
    vec4 view = modelViewMatrix * vec4(position, 1.0);
    float pulse = 0.82 + 0.18 * sin(uTime * 1.7 + phase);
    gl_PointSize = size * pulse * uScale * uPixelRatio / -view.z;
    gl_Position = projectionMatrix * view;
    vColor = color;
    vDepth = smoothstep(30.0, 9.0, -view.z);
  }
`;

const FRAGMENT = `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vDepth;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    float core = smoothstep(0.5, 0.0, d);
    float glow = pow(core, 2.4);
    gl_FragColor = vec4(vColor * (0.55 + glow), glow * vDepth * uOpacity);
  }
`;

const random = (seed: number) => {
  let state = seed;

  return () => {
    state = (state + 0x6d2b79f5) | 0;

    let value = Math.imul(state ^ (state >>> 15), 1 | state);

    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const glowMaterial = (pixelRatio: number, scale: number) =>
  new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uScale: { value: scale },
      uOpacity: { value: 1 },
    },
  });

export const createNetworkScene = (
  canvas: HTMLCanvasElement,
  { reducedMotion, onFirstFrame }: NetworkSceneOptions,
): NetworkScene => {
  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  const pixelRatio = Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO);

  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(45, 1, 0.1, 100);

  camera.position.set(0, 0, CAMERA_Z);

  const group = new Group();

  scene.add(group);

  const next = random(20261015);
  const nodes: Vector3[] = [];

  for (let index = 0; index < NODE_COUNT; index += 1) {
    const theta = next() * Math.PI * 2;
    const phi = Math.acos(2 * next() - 1);
    const radius = 0.45 + next() * 0.55;

    nodes.push(
      new Vector3(
        Math.sin(phi) * Math.cos(theta) * 10 * radius,
        Math.cos(phi) * 5.2 * radius,
        Math.sin(phi) * Math.sin(theta) * 6 * radius,
      ),
    );
  }

  const nodeColors = nodes.map(() => {
    const roll = next();

    return roll < 0.22 ? EMBER : roll < 0.3 ? GLOW : STEEL;
  });

  const nodePositions = new Float32Array(NODE_COUNT * 3);
  const nodeColorArray = new Float32Array(NODE_COUNT * 3);
  const nodeSizes = new Float32Array(NODE_COUNT);
  const nodePhases = new Float32Array(NODE_COUNT);

  nodes.forEach((node, index) => {
    node.toArray(nodePositions, index * 3);
    nodeColors[index]!.toArray(nodeColorArray, index * 3);
    nodeSizes[index] = nodeColors[index] === EMBER ? 1.6 : 0.6 + next() * 0.7;
    nodePhases[index] = next() * Math.PI * 2;
  });

  const nodeGeometry = new BufferGeometry();

  nodeGeometry.setAttribute("position", new BufferAttribute(nodePositions, 3));
  nodeGeometry.setAttribute("color", new BufferAttribute(nodeColorArray, 3));
  nodeGeometry.setAttribute("size", new BufferAttribute(nodeSizes, 1));
  nodeGeometry.setAttribute("phase", new BufferAttribute(nodePhases, 1));

  const nodeMaterial = glowMaterial(pixelRatio, 260);

  group.add(new Points(nodeGeometry, nodeMaterial));

  const edges: Array<[number, number]> = [];
  const seen = new Set<string>();

  nodes.forEach((node, index) => {
    nodes
      .map((other, otherIndex) => ({
        otherIndex,
        distance: node.distanceTo(other),
      }))
      .filter(
        ({ otherIndex, distance }) =>
          otherIndex !== index && distance < MAX_LINK,
      )
      .sort((a, b) => a.distance - b.distance)
      .slice(0, NEIGHBOURS)
      .forEach(({ otherIndex }) => {
        const key =
          index < otherIndex
            ? `${index}-${otherIndex}`
            : `${otherIndex}-${index}`;

        if (!seen.has(key)) {
          seen.add(key);
          edges.push([index, otherIndex]);
        }
      });
  });

  const linePositions = new Float32Array(edges.length * 6);
  const lineColors = new Float32Array(edges.length * 6);

  edges.forEach(([from, to], index) => {
    nodes[from]!.toArray(linePositions, index * 6);
    nodes[to]!.toArray(linePositions, index * 6 + 3);
    nodeColors[from]!.toArray(lineColors, index * 6);
    nodeColors[to]!.toArray(lineColors, index * 6 + 3);
  });

  const lineGeometry = new BufferGeometry();

  lineGeometry.setAttribute("position", new BufferAttribute(linePositions, 3));
  lineGeometry.setAttribute("color", new BufferAttribute(lineColors, 3));

  const lineMaterial = new LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.2,
    blending: AdditiveBlending,
    depthWrite: false,
  });

  group.add(new LineSegments(lineGeometry, lineMaterial));

  const packets = Array.from(
    { length: Math.min(PACKET_COUNT, edges.length) },
    () => ({
      edge: Math.floor(next() * edges.length),
      progress: next(),
      speed: 0.18 + next() * 0.4,
      forward: next() > 0.5,
    }),
  );
  const packetPositions = new Float32Array(packets.length * 3);
  const packetColors = new Float32Array(packets.length * 3);
  const packetSizes = new Float32Array(packets.length).fill(1.25);
  const packetPhases = new Float32Array(packets.length).map(
    () => next() * Math.PI * 2,
  );

  packets.forEach((_packet, index) => {
    (index % 5 === 0 ? GLOW : EMBER).toArray(packetColors, index * 3);
  });

  const packetGeometry = new BufferGeometry();

  packetGeometry.setAttribute(
    "position",
    new BufferAttribute(packetPositions, 3),
  );
  packetGeometry.setAttribute("color", new BufferAttribute(packetColors, 3));
  packetGeometry.setAttribute("size", new BufferAttribute(packetSizes, 1));
  packetGeometry.setAttribute("phase", new BufferAttribute(packetPhases, 1));

  const packetMaterial = glowMaterial(pixelRatio, 300);

  group.add(new Points(packetGeometry, packetMaterial));

  const scratch = new Vector3();

  const movePackets = (delta: number) => {
    packets.forEach((packet, index) => {
      packet.progress += packet.speed * delta;

      if (packet.progress >= 1) {
        const [, end] = edges[packet.edge]!;
        const onward = edges
          .map((edge, edgeIndex) => ({ edge, edgeIndex }))
          .filter(({ edge }) => edge[0] === end || edge[1] === end);
        const choice = onward[Math.floor(next() * onward.length)];

        packet.progress = 0;

        if (choice) {
          packet.edge = choice.edgeIndex;
          packet.forward = choice.edge[0] === end;
        } else {
          packet.edge = Math.floor(next() * edges.length);
          packet.forward = true;
        }
      }

      const [a, b] = edges[packet.edge]!;
      const from = packet.forward ? nodes[a]! : nodes[b]!;
      const to = packet.forward ? nodes[b]! : nodes[a]!;

      scratch
        .lerpVectors(from, to, packet.progress)
        .toArray(packetPositions, index * 3);
    });

    packetGeometry.attributes.position!.needsUpdate = true;
  };

  movePackets(0);

  const pointer = { x: 0, y: 0 };
  const tilt = { x: 0, y: 0 };
  let scroll = 0;

  const onPointerMove = (event: PointerEvent) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
  };

  const resize = () => {
    const parent = canvas.parentElement;
    const width = parent?.clientWidth ?? canvas.clientWidth;
    const height = parent?.clientHeight ?? canvas.clientHeight;

    if (width === 0 || height === 0) return;

    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.x = width < 768 ? 0 : -1.5;
    camera.updateProjectionMatrix();
  };

  const applyScroll = () => {
    const fade = 1 - scroll * 0.95;

    nodeMaterial.uniforms.uOpacity!.value = fade;
    packetMaterial.uniforms.uOpacity!.value = fade;
    lineMaterial.opacity = 0.2 * fade;
    group.position.y = scroll * 3.5;
    camera.position.z = CAMERA_Z + scroll * 5;
  };

  let elapsed = 0;
  let last = performance.now();
  let frame = 0;
  let visible = true;
  let first = true;

  const render = () => {
    renderer.render(scene, camera);

    if (first) {
      first = false;
      onFirstFrame?.();
    }
  };

  const tick = (now: number) => {
    frame = requestAnimationFrame(tick);

    const delta = Math.min((now - last) / 1000, 0.05);

    last = now;

    if (!visible) return;

    elapsed += delta;
    nodeMaterial.uniforms.uTime!.value = elapsed;
    packetMaterial.uniforms.uTime!.value = elapsed;
    tilt.x = MathUtils.lerp(tilt.x, pointer.y * 0.18, 0.04);
    tilt.y = MathUtils.lerp(tilt.y, pointer.x * 0.3, 0.04);
    group.rotation.x = 0.18 + tilt.x;
    group.rotation.y = elapsed * 0.045 + tilt.y;
    movePackets(delta);
    render();
  };

  const observer = new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting) && !document.hidden;
  });
  const resizeObserver = new ResizeObserver(() => {
    resize();

    if (reducedMotion) render();
  });
  const onVisibility = () => {
    visible = !document.hidden;
  };

  observer.observe(canvas);
  resizeObserver.observe(canvas.parentElement ?? canvas);
  document.addEventListener("visibilitychange", onVisibility);
  resize();
  group.rotation.x = 0.18;

  if (reducedMotion) {
    render();
  } else {
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    frame = requestAnimationFrame(tick);
  }

  return {
    setScroll: (progress) => {
      scroll = MathUtils.clamp(progress, 0, 1);
      applyScroll();

      if (reducedMotion) render();
    },
    dispose: () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointerMove);
      nodeGeometry.dispose();
      lineGeometry.dispose();
      packetGeometry.dispose();
      nodeMaterial.dispose();
      lineMaterial.dispose();
      packetMaterial.dispose();
      renderer.dispose();
    },
  };
};

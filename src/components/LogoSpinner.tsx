'use client';

/**
 * AI 解读等待动画 —— 品牌「弯月七芒」Logo
 * 与导航栏 logo 同源：月牙自转 + 半径形变（月牙↔太阳），光芒静止，
 * 速度加快为 2.4s 一循环，作为等待指示器。
 */
export default function LogoSpinner({ size = 64 }: { size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* 柔光晕 */}
      <div className="absolute inset-0 rounded-full bg-accent/15 blur-lg" aria-hidden="true" />
      <svg
        viewBox="0 0 1200 852"
        className="relative h-full w-auto text-accent"
        style={{ maxHeight: size }}
        aria-hidden="true"
      >
        <defs>
          <mask id={`logoSpinMask-${size}`}>
            <rect width="1200" height="852" fill="white" />
            <circle cx="625" cy="348" r="74" fill="black">
              <animate
                attributeName="r"
                values="74;74;0;0;74"
                keyTimes="0;0.15;0.5;0.75;1"
                dur="2.4s"
                repeatCount="indefinite"
                calcMode="spline"
                keySplines="0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1"
              />
            </circle>
          </mask>
        </defs>
        <circle cx="603" cy="374" r="96" fill="currentColor" mask={`url(#logoSpinMask-${size})`}>
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="0 603 374;540 603 374;1080 603 374"
            keyTimes="0;0.55;1"
            dur="2.4s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.55 0.06 0.3 1;0.55 0.06 0.3 1"
          />
        </circle>
        <g fill="currentColor">
          <path d="M 475 410 L 475 418 L 414 438 Z" />
          <path d="M 729 410 L 729 418 L 789 438 Z" />
          <path d="M 503 453 L 514 464 L 397 570 Z" />
          <path d="M 691 464 L 702 453 L 809 570 Z" />
          <path d="M 547 486 L 559 490 L 522 566 Z" />
          <path d="M 647 490 L 659 486 L 683 566 Z" />
          <path d="M 598 495 L 614 495 L 606 760 Z" />
        </g>
      </svg>
    </div>
  );
}

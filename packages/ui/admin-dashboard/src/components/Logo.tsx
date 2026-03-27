"use client";

import { useId, useState, useEffect } from "react";

const RIGHT_PATH_D = `M3785.1,803.47v2393.05h-475.17V1422.73l-335,89.76l-288.44,77.29c-4.38,1.1-8.74,2.25-13.08,3.46
            c-189.11,52.58-338.17,203.98-387.4,394.42c-11.36,43.93-17.41,89.93-17.41,137.28v1071.58h-475.16V2124.94
            c0-46.53,3.13-92.35,9.2-137.28c12.14-89.82,36-176.05,69.99-257.08c32.7-77.98,74.79-151.16,124.81-218.09
            c135.51-181.33,329.32-316.87,553-378.19l11.22-3.01L3785.1,803.47z`;

const LEFT_PATH_D = `M690.07,1674.37c-125.6,80.57-232.72,187.69-313.29,313.29c-102.38,159.6-161.88,349.03-161.88,551.68v182.02
            v475.17h475.17v-475.17v-36.01v-146.01c0-303.43,248.26-551.68,551.68-551.68h0c179.69,0,340.03,87.06,440.92,221.09
            c0-27.94,0-55.87,0-83.81c0-45.88,2.76-91.74,8.3-137.28c0.6-4.95,1.24-9.89,1.9-14.83c13.24-98,39.36-193.89,77.61-285.09
            c3.08-7.33,6.23-14.62,9.45-21.89c-156.74-97.16-341.22-153.37-538.19-153.37C1039.1,1512.49,849.68,1571.98,690.07,1674.37
            L690.07,1674.37z`;

// Total cycle: left animates 0s–0.55s, right animates 0.45s–1.0s, pause until 1.8s, then repeat
const CYCLE_MS = 1800;

export default function Logo({
  width = 28,
  height = 28,
  showText = true,
  loading = false,
  className = "",
}: {
  width?: number;
  height?: number;
  showText?: boolean;
  loading?: boolean;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const logoWidth = width || 28;
  const logoHeight = height || 28;
  const leftClipId = `logo-left-clip-${id}`;
  const rightClipId = `logo-right-clip-${id}`;
  const [animationRun, setAnimationRun] = useState(loading ? 1 : 0);

  // When loading, restart the animation on each cycle
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setAnimationRun((n) => n + 1);
    }, CYCLE_MS);
    return () => clearInterval(interval);
  }, [loading]);

  return (
    <div
      className={`inline-flex items-center gap-2 ${className}`}
      onMouseEnter={() => !loading && setAnimationRun((n) => n + 1)}
    >
      <svg
        key={animationRun}
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        x="0"
        y="0"
        width={logoWidth}
        height={logoHeight}
        viewBox="0 0 4000 4000"
        aria-hidden="true"
      >
        <defs>
          <clipPath id={leftClipId}>
            <rect x="0" y="4000" width="4000" height="0">
              <animate
                attributeName="y"
                from="4000"
                to="0"
                dur="0.55s"
                begin="0s"
                fill="freeze"
              />
              <animate
                attributeName="height"
                from="0"
                to="4000"
                dur="0.55s"
                begin="0s"
                fill="freeze"
              />
            </rect>
          </clipPath>
          <clipPath id={rightClipId}>
            <rect x="0" y="4000" width="4000" height="0">
              <animate
                attributeName="y"
                from="4000"
                to="0"
                dur="0.55s"
                begin="0.45s"
                fill="freeze"
              />
              <animate
                attributeName="height"
                from="0"
                to="4000"
                dur="0.55s"
                begin="0.45s"
                fill="freeze"
              />
            </rect>
          </clipPath>
        </defs>

        {/* Ghost / dim base paths */}
        <path
          d={LEFT_PATH_D}
          fill="currentColor"
          fillOpacity="0.2"
          fillRule="evenodd"
          clipRule="evenodd"
        />
        <path
          d={RIGHT_PATH_D}
          fill="currentColor"
          fillOpacity="0.2"
          fillRule="evenodd"
          clipRule="evenodd"
        />

        {/* Animated fill paths */}
        <path
          d={LEFT_PATH_D}
          fill="currentColor"
          fillRule="evenodd"
          clipRule="evenodd"
          clipPath={`url(#${leftClipId})`}
        />
        <path
          d={RIGHT_PATH_D}
          fill="currentColor"
          fillRule="evenodd"
          clipRule="evenodd"
          clipPath={`url(#${rightClipId})`}
        />
      </svg>

      {showText && <span className="text-xl font-bold">Meridian.js</span>}
    </div>
  );
}

import "./PillNav.css";

import { gsap } from "gsap";
import type { FC } from "react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

export type PillNavItem = {
  label: string;
  href: string;
  ariaLabel?: string;
};

export interface PillNavProps {
  logo?: string;
  logoAlt?: string;
  items: PillNavItem[];
  activeHref?: string;
  className?: string;
  ease?: string;
  baseColor?: string;
  pillColor?: string;
  hoveredPillTextColor?: string;
  pillTextColor?: string;
  onMobileMenuClick?: () => void;
  initialLoadAnimation?: boolean;
}

const LogoNode: FC<{
  logo?: string;
  logoAlt: string;
  logoImgRef: React.Ref<HTMLImageElement>;
}> = ({ logo, logoAlt, logoImgRef }): JSX.Element => {
  if (logo) {
    return (
      <img
        src={logo}
        alt={logoAlt}
        ref={logoImgRef}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    );
  }
  return (
    <span className="pill-logo-fallback" aria-hidden="true">
      A
    </span>
  );
};

const PillNav: FC<PillNavProps> = ({
  logo,
  logoAlt = "Logo",
  items,
  activeHref,
  className = "",
  ease = "power3.easeOut",
  baseColor = "var(--color-bg-alt)",
  pillColor = "var(--color-surface)",
  hoveredPillTextColor = "var(--color-text)",
  pillTextColor,
  onMobileMenuClick,
  initialLoadAnimation = true,
}) => {
  const resolvedPillTextColor = pillTextColor ?? "var(--color-text-muted)";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const circleRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const tlRefs = useRef<Array<gsap.core.Timeline | null>>([]);
  const activeTweenRefs = useRef<Array<gsap.core.Tween | null>>([]);
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const logoTweenRef = useRef<gsap.core.Tween | null>(null);
  const hamburgerRef = useRef<HTMLButtonElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const navItemsRef = useRef<HTMLDivElement | null>(null);
  const logoRef = useRef<HTMLAnchorElement | HTMLSpanElement | null>(null);

  const location = useLocation();
  const currentHref = activeHref ?? location.pathname;

  const layoutForIndex = useCallback(
    (index: number): void => {
      const circle = circleRefs.current[index];
      if (!circle || !circle.parentElement) return;

      const pill = circle.parentElement;
      const rect = pill.getBoundingClientRect();
      const { width: w, height: h } = rect;

      const R = ((w * w) / 4 + h * h) / (2 * h);
      const D = Math.ceil(2 * R) + 2;
      const delta =
        Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1;
      const originY = D - delta;

      circle.style.width = `${String(D)}px`;
      circle.style.height = `${String(D)}px`;
      circle.style.bottom = `-${String(delta)}px`;

      gsap.set(circle, {
        xPercent: -50,
        scale: 0,
        transformOrigin: `50% ${String(originY)}px`,
      });

      const label = pill.querySelector<HTMLElement>(".pill-label");
      const white = pill.querySelector<HTMLElement>(".pill-label-hover");

      if (label) gsap.set(label, { y: 0 });
      if (white) gsap.set(white, { y: h + 12, opacity: 0 });

      tlRefs.current[index]?.kill();
      const tl = gsap.timeline({ paused: true });

      tl.to(
        circle,
        { scale: 1.2, xPercent: -50, duration: 2, ease, overwrite: "auto" },
        0,
      );

      if (label) {
        tl.to(label, { y: -(h + 8), duration: 2, ease, overwrite: "auto" }, 0);
      }

      if (white) {
        gsap.set(white, { y: Math.ceil(h + 100), opacity: 0 });
        tl.to(
          white,
          { y: 0, opacity: 1, duration: 2, ease, overwrite: "auto" },
          0,
        );
      }

      tlRefs.current[index] = tl;
    },
    [ease],
  );

  useEffect(() => {
    if (circleRefs.current.length !== items.length) {
      circleRefs.current.length = items.length;
      tlRefs.current.length = items.length;
      activeTweenRefs.current.length = items.length;
    }

    const layoutAll = (): void => {
      for (let i = 0; i < items.length; i += 1) {
        layoutForIndex(i);
      }
    };

    const id1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        layoutAll();
      });
    });

    const onResize = (): void => {
      layoutAll();
    };
    window.addEventListener("resize", onResize);

    const fonts = (document as { fonts?: FontFaceSet }).fonts;
    if (fonts) {
      void fonts.ready.then(layoutAll);
    }

    const menu = mobileMenuRef.current;
    if (menu) {
      gsap.set(menu, { visibility: "hidden", opacity: 0, scaleY: 1 });
    }

    if (initialLoadAnimation) {
      const logoEl = logoRef.current;
      const navItems = navItemsRef.current;

      if (logoEl) {
        gsap.set(logoEl, { scale: 0 });
        gsap.to(logoEl, { scale: 1, duration: 0.6, ease });
      }

      if (navItems) {
        gsap.set(navItems, { width: 0, overflow: "hidden" });
        gsap.to(navItems, { width: "auto", duration: 0.6, ease });
      }
    }

    return (): void => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(id1);
    };
  }, [ease, initialLoadAnimation, items, layoutForIndex]);

  const handleEnter = (i: number): void => {
    if (!tlRefs.current[i]) {
      layoutForIndex(i);
    }
    const tl = tlRefs.current[i];
    if (!tl) return;
    activeTweenRefs.current[i]?.kill();
    activeTweenRefs.current[i] = tl.tweenTo(tl.duration(), {
      duration: 0.3,
      ease,
      overwrite: "auto",
    });
  };

  const handleLeave = (i: number): void => {
    const tl = tlRefs.current[i];
    if (!tl) return;
    activeTweenRefs.current[i]?.kill();
    activeTweenRefs.current[i] = tl.tweenTo(0, {
      duration: 0.2,
      ease,
      overwrite: "auto",
    });
  };

  const handleLogoEnter = (): void => {
    const img = logoImgRef.current;
    if (!img) return;
    logoTweenRef.current?.kill();
    gsap.set(img, { rotate: 0 });
    logoTweenRef.current = gsap.to(img, {
      rotate: 360,
      duration: 0.2,
      ease,
      overwrite: "auto",
    });
  };

  const toggleMobileMenu = (): void => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);

    const hamburger = hamburgerRef.current;
    const menu = mobileMenuRef.current;

    if (hamburger) {
      const lines = hamburger.querySelectorAll(".hamburger-line");
      if (newState) {
        gsap.to(lines[0], { rotation: 45, y: 3, duration: 0.3, ease });
        gsap.to(lines[1], { rotation: -45, y: -3, duration: 0.3, ease });
      } else {
        gsap.to(lines[0], { rotation: 0, y: 0, duration: 0.3, ease });
        gsap.to(lines[1], { rotation: 0, y: 0, duration: 0.3, ease });
      }
    }

    if (menu) {
      if (newState) {
        gsap.set(menu, { visibility: "visible" });
        gsap.fromTo(
          menu,
          { opacity: 0, y: 10, scaleY: 1 },
          {
            opacity: 1,
            y: 0,
            scaleY: 1,
            duration: 0.3,
            ease,
            transformOrigin: "top center",
          },
        );
      } else {
        gsap.to(menu, {
          opacity: 0,
          y: 10,
          scaleY: 1,
          duration: 0.2,
          ease,
          transformOrigin: "top center",
          onComplete: () => {
            gsap.set(menu, { visibility: "hidden" });
          },
        });
      }
    }

    onMobileMenuClick?.();
  };

  const isExternalLink = (href: string): boolean =>
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("//") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("#");

  const isRouterLink = (href?: string): boolean =>
    href ? !isExternalLink(href) : false;

  const cssVars = {
    "--base": baseColor,
    "--pill-bg": pillColor,
    "--hover-text": hoveredPillTextColor,
    "--pill-text": resolvedPillTextColor,
  } as React.CSSProperties;

  return (
    <div className="pill-nav-container">
      <div className="pill-nav-frame">
        <nav
          className={`pill-nav ${className}`}
          aria-label="Primary"
          style={cssVars}
        >
          <Link
            className="pill-logo"
            to={items[0]?.href || "/"}
            aria-label="Home"
            onMouseEnter={handleLogoEnter}
            role="menuitem"
            ref={(el) => {
              logoRef.current = el;
            }}
          >
            <LogoNode logo={logo} logoAlt={logoAlt} logoImgRef={logoImgRef} />
          </Link>

          <div className="pill-nav-items desktop-only" ref={navItemsRef}>
            <ul className="pill-list" role="menubar">
              {items.map((item, i) => {
                const isActive = currentHref === item.href;
                const PillTag: React.ElementType = isRouterLink(item.href)
                  ? Link
                  : "a";
                const pillProps =
                  PillTag === Link
                    ? { to: item.href }
                    : { href: item.href, rel: "noopener noreferrer" };

                return (
                  <li key={item.href} role="none">
                    <PillTag
                      {...pillProps}
                      role="menuitem"
                      className={`pill${isActive ? " is-active" : ""}`}
                      aria-label={item.ariaLabel || item.label}
                      onMouseEnter={() => {
                        handleEnter(i);
                      }}
                      onMouseLeave={() => {
                        handleLeave(i);
                      }}
                    >
                      <span
                        className="hover-circle"
                        aria-hidden="true"
                        ref={(el: HTMLSpanElement | null) => {
                          circleRefs.current[i] = el;
                          if (el) {
                            requestAnimationFrame(() => {
                              layoutForIndex(i);
                            });
                          } else {
                            tlRefs.current[i]?.kill();
                            tlRefs.current[i] = null;
                          }
                        }}
                      />
                      <span className="label-stack">
                        <span className="pill-label">{item.label}</span>
                        <span className="pill-label-hover" aria-hidden="true">
                          {item.label}
                        </span>
                      </span>
                    </PillTag>
                  </li>
                );
              })}
            </ul>
          </div>

          <button
            className="mobile-menu-button mobile-only"
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
            ref={hamburgerRef}
            type="button"
          >
            <span className="hamburger-line" />
            <span className="hamburger-line" />
          </button>
        </nav>
      </div>
      <div
        className="mobile-menu-popover mobile-only"
        ref={mobileMenuRef}
        style={cssVars}
      >
        <ul className="mobile-menu-list">
          {items.map((item, i) => {
            const isActive = currentHref === item.href;
            const LinkTag: React.ElementType = isRouterLink(item.href)
              ? Link
              : "a";
            const linkProps =
              LinkTag === Link
                ? { to: item.href }
                : { href: item.href, rel: "noopener noreferrer" };

            return (
              <li key={item.href}>
                <LinkTag
                  {...linkProps}
                  className={`mobile-menu-link${isActive ? " is-active" : ""}`}
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                  }}
                  onMouseEnter={() => {
                    handleEnter(i);
                  }}
                  onMouseLeave={() => {
                    handleLeave(i);
                  }}
                >
                  {item.label}
                </LinkTag>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default PillNav;

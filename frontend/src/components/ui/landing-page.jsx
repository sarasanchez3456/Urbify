import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Globe from "./globe";
import { cn } from "./utils";

const defaultGlobeConfig = {
  positions: [
    { top: "50%", left: "75%", scale: 1.4 },
    { top: "25%", left: "50%", scale: 0.9 },
    { top: "15%", left: "90%", scale: 2 },
    { top: "50%", left: "50%", scale: 1.8 },
  ]
};

function lerp(start, end, factor) {
  return start + (end - start) * factor;
}

function parsePercent(str) {
  return parseFloat(str.replace('%', ''));
}

export function ScrollGlobe({ sections, globeConfig = defaultGlobeConfig, className }) {
  const [activeSection, setActiveSection] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [globeTransform, setGlobeTransform] = useState("");
  const containerRef = useRef(null);
  const sectionRefs = useRef([]);
  const animationFrameId = useRef(null);

  const calculatedPositions = useMemo(() => {
    return globeConfig.positions.map(function(pos) {
      return {
        top: parsePercent(pos.top),
        left: parsePercent(pos.left),
        scale: pos.scale
      };
    });
  }, [globeConfig.positions]);

  const updateScrollPosition = useCallback(function() {
    const scrollTop = window.pageYOffset;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = Math.min(Math.max(scrollTop / docHeight, 0), 1);
    setScrollProgress(progress);

    const viewportCenter = window.innerHeight / 2;
    var newActiveSection = 0;
    var minDistance = Infinity;

    sectionRefs.current.forEach(function(ref, index) {
      if (ref) {
        var rect = ref.getBoundingClientRect();
        var sectionCenter = rect.top + rect.height / 2;
        var distance = Math.abs(sectionCenter - viewportCenter);
        if (distance < minDistance) {
          minDistance = distance;
          newActiveSection = index;
        }
      }
    });

    var currentPos = calculatedPositions[newActiveSection];
    var transform = "translate3d(" + currentPos.left + "vw, " + currentPos.top + "vh, 0) translate3d(-50%, -50%, 0) scale3d(" + currentPos.scale + ", " + currentPos.scale + ", 1)";
    setGlobeTransform(transform);
    setActiveSection(newActiveSection);
  }, [calculatedPositions]);

  useEffect(function() {
    var ticking = false;
    var handleScroll = function() {
      if (!ticking) {
        animationFrameId.current = requestAnimationFrame(function() {
          updateScrollPosition();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    updateScrollPosition();

    return function() {
      window.removeEventListener("scroll", handleScroll);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [updateScrollPosition]);

  useEffect(function() {
    var initialPos = calculatedPositions[0];
    var initialTransform = "translate3d(" + initialPos.left + "vw, " + initialPos.top + "vh, 0) translate3d(-50%, -50%, 0) scale3d(" + initialPos.scale + ", " + initialPos.scale + ", 1)";
    setGlobeTransform(initialTransform);
  }, [calculatedPositions]);

  return (
    <div ref={containerRef} className={cn("relative w-full max-w-screen overflow-x-hidden min-h-screen", className)}>
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-0.5 z-50" style={{ background: "linear-gradient(90deg, rgba(169,210,182,0.2), rgba(169,210,182,0.4), rgba(169,210,182,0.2))" }}>
        <div
          className="h-full will-change-transform shadow-sm"
          style={{
            transform: "scaleX(" + scrollProgress + ")",
            transformOrigin: "left center",
            transition: "transform 0.15s ease-out",
            background: "linear-gradient(90deg, #a9d2b6, #1e4f43)",
            filter: "drop-shadow(0 0 2px rgba(169,210,182,0.3))",
            width: "100%"
          }}
        />
      </div>

      {/* Side Navigation */}
      <div className="hidden sm:flex fixed right-4 lg:right-8 top-1/2 -translate-y-1/2 z-40">
        <div className="space-y-4 lg:space-y-6">
          {sections.map(function(section, index) {
            return (
              <div key={index} className="relative group">
                <div
                  className={cn(
                    "nav-label absolute right-8 top-1/2 -translate-y-1/2",
                    "px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg text-sm font-medium whitespace-nowrap",
                    "backdrop-blur-md border z-50",
                    activeSection === index ? "animate-fadeOut" : "opacity-0"
                  )}
                  style={{
                    background: "rgba(9,35,36,0.95)",
                    borderColor: "rgba(169,210,182,0.2)",
                    color: "#a9d2b6",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 lg:w-2 h-1.5 lg:h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-sm lg:text-base">{section.badge || ("Section " + (index + 1))}</span>
                  </div>
                </div>
                <button
                  onClick={function() {
                    if (sectionRefs.current[index]) {
                      sectionRefs.current[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }}
                  className={cn(
                    "relative w-2.5 lg:w-3 h-2.5 lg:h-3 rounded-full border-2 transition-all duration-300 hover:scale-125",
                    "before:absolute before:inset-0 before:rounded-full before:transition-all before:duration-300",
                    activeSection === index
                      ? "border-primary shadow-lg before:animate-ping"
                      : "border-muted-foreground/40 hover:border-primary/60"
                  )}
                  style={{
                    backgroundColor: activeSection === index ? "#a9d2b6" : "transparent",
                    borderColor: activeSection === index ? "#a9d2b6" : "rgba(193,200,193,0.4)",
                  }}
                  aria-label={"Go to " + (section.badge || ("section " + (index + 1)))}
                />
              </div>
            );
          })}
        </div>
        <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 -z-10" style={{ background: "linear-gradient(to bottom, transparent, rgba(169,210,182,0.2), transparent)" }} />
      </div>

      {/* Globe */}
      <div
        className="fixed z-10 pointer-events-none will-change-transform"
        style={{
          transform: globeTransform,
          transition: "all 1400ms cubic-bezier(0.23,1,0.32,1)",
          opacity: 0.2,
          filter: "drop-shadow(0 0 50px rgba(169,210,182,0.15))",
        }}
      >
        <div className="scale-75 sm:scale-90 lg:scale-100">
          <Globe />
        </div>
      </div>

      {/* Sections */}
      {sections.map(function(section, index) {
        var alignClasses = "";
        if (section.align === 'center') alignClasses = "items-center text-center";
        else if (section.align === 'right') alignClasses = "items-end text-right";
        else alignClasses = "items-start text-left";

        var containerAlign = "";
        if (section.align === 'center') containerAlign = "mx-auto";
        else if (section.align === 'right') containerAlign = "ml-auto";
        else containerAlign = "";

        return (
          <section
            key={section.id}
            ref={function(el) { sectionRefs.current[index] = el; }}
            className={cn(
              "relative min-h-screen flex flex-col justify-center px-4 sm:px-6 md:px-8 lg:px-12 z-20 py-12 sm:py-16 lg:py-20",
              "w-full max-w-full overflow-hidden",
              alignClasses
            )}
          >
            <div className={cn("w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl will-change-transform transition-all duration-700", "opacity-100 translate-y-0", containerAlign)}>
              <h1 className={cn(
                "font-bold mb-6 sm:mb-8 leading-[1.1] tracking-tight",
                index === 0
                  ? "text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl"
                  : "text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl"
              )}>
                {section.subtitle ? (
                  <div className="space-y-1 sm:space-y-2">
                    <div className="bg-gradient-to-r from-[#cde8e8] to-[#cde8e8]/80 bg-clip-text text-transparent">
                      {section.title}
                    </div>
                    <div className="text-[#a9d2b6] text-[0.6em] sm:text-[0.7em] font-medium tracking-wider">
                      {section.subtitle}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-[#cde8e8] via-[#cde8e8] to-[#cde8e8]/80 bg-clip-text text-transparent">
                    {section.title}
                  </div>
                )}
              </h1>

              <div className={cn(
                "text-[rgba(193,200,193,0.6)] leading-relaxed mb-8 sm:mb-10 text-base sm:text-lg lg:text-xl font-light",
                section.align === 'center' ? "max-w-full mx-auto text-center" : "max-w-full"
              )}>
                <p className="mb-3 sm:mb-4">{section.description}</p>
                {index === 0 && (
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-[rgba(193,200,193,0.4)] mt-4 sm:mt-6">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div className="w-1 h-1 rounded-full bg-[#a9d2b6] animate-pulse" />
                      <span>Interactive Experience</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div className="w-1 h-1 rounded-full bg-[#a9d2b6] animate-pulse" style={{ animationDelay: '0.5s' }} />
                      <span>Scroll to Explore</span>
                    </div>
                  </div>
                )}
              </div>

              {section.features && (
                <div className="grid gap-3 sm:gap-4 mb-8 sm:mb-10">
                  {section.features.map(function(feature, featureIndex) {
                    return (
                      <div
                        key={feature.title}
                        className={cn(
                          "group p-4 sm:p-5 lg:p-6 rounded-lg sm:rounded-xl border backdrop-blur-sm transition-all duration-300 hover:shadow-lg",
                          "hover:-translate-y-1"
                        )}
                        style={{
                          background: "rgba(9,35,36,0.3)",
                          borderColor: "rgba(169,210,182,0.08)",
                          animationDelay: (featureIndex * 0.1) + "s",
                        }}
                      >
                        <div className="flex items-start gap-3 sm:gap-4">
                          <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full mt-1.5 sm:mt-2 flex-shrink-0" style={{ backgroundColor: "rgba(169,210,182,0.6)" }} />
                          <div className="flex-1 space-y-1.5 sm:space-y-2 min-w-0">
                            <h3 className="font-semibold text-base sm:text-lg" style={{ color: "#cde8e8" }}>{feature.title}</h3>
                            <p className="leading-relaxed text-sm sm:text-base" style={{ color: "rgba(193,200,193,0.5)" }}>{feature.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {section.actions && (
                <div className={cn(
                  "flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4",
                  section.align === 'center' && "justify-center",
                  section.align === 'right' && "justify-end",
                  (!section.align || section.align === 'left') && "justify-start"
                )}>
                  {section.actions.map(function(action, actionIndex) {
                    return (
                      <button
                        key={action.label}
                        onClick={action.onClick}
                        className={cn(
                          "group relative px-6 sm:px-8 py-3 sm:py-4 rounded-lg sm:rounded-xl font-medium transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] text-sm sm:text-base",
                          "hover:shadow-lg focus:outline-none focus:ring-2 w-full sm:w-auto",
                          action.variant === 'primary'
                            ? "shadow-lg"
                            : "border-2 bg-background/50 backdrop-blur-sm hover:opacity-80"
                        )}
                        style={{
                          background: action.variant === 'primary'
                            ? "linear-gradient(135deg, #a9d2b6, #1e4f43)"
                            : "transparent",
                          color: action.variant === 'primary' ? "#001718" : "rgba(205,232,232,0.65)",
                          borderColor: action.variant === 'primary' ? "transparent" : "rgba(169,210,182,0.2)",
                          boxShadow: action.variant === 'primary' ? "0 0 20px rgba(169,210,182,0.2)" : "none",
                          animationDelay: ((actionIndex * 0.1) + 0.2) + "s",
                        }}
                      >
                        <span className="relative z-10">{action.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}


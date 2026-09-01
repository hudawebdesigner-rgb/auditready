/* CR8 3D Hero & Landing — vanilla JS, no build step.
 * Three.js is loaded lazily from a pinned CDN URL only when a WebGL-capable,
 * non-mobile, non-reduced-motion viewport actually scrolls the hero into view.
 */
(function () {
  "use strict";

  var THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
  var MAX_DPR = 2;

  /* ---------------- capability detection ---------------- */

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function supportsWebGL() {
    try {
      var canvas = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")));
    } catch (e) {
      return false;
    }
  }

  function isMobileOrLowPower() {
    var coarsePointer = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    var narrowViewport = window.innerWidth < 768;
    var lowMemory = "deviceMemory" in navigator && navigator.deviceMemory <= 4;
    var lowCores = "hardwareConcurrency" in navigator && navigator.hardwareConcurrency <= 2;
    var saveData = navigator.connection && navigator.connection.saveData;
    return !!(coarsePointer || narrowViewport || lowMemory || lowCores || saveData);
  }

  function getMode() {
    if (prefersReducedMotion()) return "static";
    if (supportsWebGL() && !isMobileOrLowPower()) return "3d";
    return "css-parallax";
  }

  /* ---------------- money formatting (matches server-rendered sample string) ---------------- */

  function formatMoneyLike(cents, sampleFormatted) {
    var match = sampleFormatted && sampleFormatted.match(/^(\D*)([\d.,\s]+)(\D*)$/);
    var prefix = match ? match[1] : "";
    var suffix = match ? match[3] : "";
    var usesCommaDecimal = match && /,\d{2}$/.test(match[2].trim());
    var amount = (cents / 100).toFixed(2);
    if (usesCommaDecimal) amount = amount.replace(".", ",");
    return prefix + amount + suffix;
  }

  /* ---------------- reveal + parallax controller ---------------- */

  function initRevealAndParallax(root, mode, onProgress) {
    var revealEls = root.querySelectorAll("[data-cr8-reveal]");
    if ("IntersectionObserver" in window) {
      var revealObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              revealObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15 }
      );
      revealEls.forEach(function (el) {
        revealObserver.observe(el);
      });
    } else {
      revealEls.forEach(function (el) {
        el.classList.add("is-visible");
      });
    }

    if (mode === "static") return null;

    var parallaxEls = Array.prototype.slice.call(root.querySelectorAll("[data-cr8-parallax]"));
    var hero = root.querySelector("[data-cr8-hero]");
    var ticking = false;

    function applyParallax() {
      ticking = false;
      if (!hero) return;
      var rect = hero.getBoundingClientRect();
      var viewportH = window.innerHeight || document.documentElement.clientHeight;
      var progress = (viewportH - rect.top) / (viewportH + rect.height);

      parallaxEls.forEach(function (el) {
        var speed = parseFloat(el.getAttribute("data-cr8-parallax")) || 0;
        var offset = (progress - 0.5) * speed * 200;
        el.style.transform = "translate3d(0, " + offset.toFixed(1) + "px, 0)";
      });

      if (onProgress) onProgress(Math.min(Math.max(progress, 0), 1));
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(applyParallax);
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    applyParallax();

    return { heroRect: function () { return hero ? hero.getBoundingClientRect() : null; } };
  }

  /* ---------------- smooth scroll-to for CTA links ---------------- */

  function initScrollLinks(root, reducedMotion) {
    root.querySelectorAll("[data-cr8-scroll-to]").forEach(function (link) {
      link.addEventListener("click", function (e) {
        var target = document.querySelector(link.getAttribute("data-cr8-scroll-to"));
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
      });
    });
  }

  /* ---------------- Three.js scene ---------------- */

  function initThreeScene(root, canvas, imageUrl) {
    var wrap = canvas.parentElement;
    var raf = null;
    var disposed = false;
    var visible = true;
    var pointer = { x: 0, y: 0 };
    var targetPointer = { x: 0, y: 0 };
    var scrollProgress = 0;

    import(/* webpackIgnore: true */ THREE_URL)
      .then(function (THREE) {
        if (disposed) return;

        var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR));

        var scene = new THREE.Scene();
        var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
        camera.position.set(0, 0, 6);

        var hemi = new THREE.HemisphereLight(0xffffff, 0x0a0a0a, 0.6);
        scene.add(hemi);

        var key = new THREE.DirectionalLight(0xffffff, 0.9);
        key.position.set(2, 3, 4);
        scene.add(key);

        var rim = new THREE.PointLight(0xffe600, 2.2, 12);
        rim.position.set(-2.5, 1, -2);
        scene.add(rim);

        var productGroup = new THREE.Group();

        var bodyGeo = new THREE.CylinderGeometry(1, 1.05, 2.1, 10, 1);
        var bodyMat = new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 0.55, metalness: 0.25 });
        var body = new THREE.Mesh(bodyGeo, bodyMat);
        productGroup.add(body);

        var lidGeo = new THREE.CylinderGeometry(1.02, 1.02, 0.22, 10, 1);
        var lidMat = new THREE.MeshStandardMaterial({ color: 0xffe600, roughness: 0.4, metalness: 0.1 });
        var lid = new THREE.Mesh(lidGeo, lidMat);
        lid.position.y = 1.16;
        productGroup.add(lid);

        var loader = new THREE.TextureLoader();
        loader.crossOrigin = "anonymous";
        loader.load(
          imageUrl,
          function (texture) {
            texture.colorSpace = THREE.SRGBColorSpace;
            var labelGeo = new THREE.CylinderGeometry(1.011, 1.061, 1.7, 10, 1, true, Math.PI * 0.75, Math.PI * 1.5);
            var labelMat = new THREE.MeshStandardMaterial({
              map: texture,
              transparent: true,
              roughness: 0.5,
              metalness: 0.1,
              side: THREE.DoubleSide,
            });
            var label = new THREE.Mesh(labelGeo, labelMat);
            productGroup.add(label);
          },
          undefined,
          function () {
            /* texture failed to load; canister still renders without a label */
          }
        );

        scene.add(productGroup);

        var particleCount = 260;
        var positions = new Float32Array(particleCount * 3);
        for (var i = 0; i < particleCount; i++) {
          positions[i * 3] = (Math.random() - 0.5) * 10;
          positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 6 - 2;
        }
        var particleGeo = new THREE.BufferGeometry();
        particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        var particleMat = new THREE.PointsMaterial({
          color: 0xffe600,
          size: 0.03,
          transparent: true,
          opacity: 0.45,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        var particles = new THREE.Points(particleGeo, particleMat);
        scene.add(particles);

        function resize() {
          var w = wrap.clientWidth;
          var h = wrap.clientHeight;
          if (!w || !h) return;
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        }
        resize();

        var resizeObserver = "ResizeObserver" in window ? new ResizeObserver(resize) : null;
        if (resizeObserver) resizeObserver.observe(wrap);
        else window.addEventListener("resize", resize);

        var clock = new THREE.Clock();

        function tick() {
          if (disposed) return;
          raf = window.requestAnimationFrame(tick);
          if (!visible) return;

          var dt = clock.getDelta();

          pointer.x += (targetPointer.x - pointer.x) * 0.05;
          pointer.y += (targetPointer.y - pointer.y) * 0.05;

          productGroup.rotation.y += dt * 0.25 + scrollProgress * 0.002;
          productGroup.rotation.x = pointer.y * 0.15;
          productGroup.rotation.z = pointer.x * -0.08;
          productGroup.position.y = Math.sin(clock.elapsedTime * 0.6) * 0.08;

          camera.position.x = pointer.x * 0.4;
          camera.position.y = pointer.y * 0.25;
          camera.position.z = 6 - scrollProgress * 1.5;
          camera.lookAt(0, 0, 0);

          particles.rotation.y += dt * 0.02;

          renderer.render(scene, camera);
        }

        function onPointerMove(e) {
          var w = window.innerWidth;
          var h = window.innerHeight;
          targetPointer.x = (e.clientX / w) * 2 - 1;
          targetPointer.y = (e.clientY / h) * 2 - 1;
        }
        window.addEventListener("pointermove", onPointerMove, { passive: true });

        canvas.addEventListener("webglcontextlost", function (e) {
          e.preventDefault();
          visible = false;
          canvas.classList.remove("is-ready");
        });

        var api = {
          setScrollProgress: function (p) {
            scrollProgress = p;
          },
          setVisible: function (v) {
            visible = v;
          },
          dispose: function () {
            disposed = true;
            if (raf) window.cancelAnimationFrame(raf);
            window.removeEventListener("pointermove", onPointerMove);
            if (resizeObserver) resizeObserver.disconnect();
            renderer.dispose();
          },
        };

        canvas.classList.add("is-ready");
        root.setAttribute("data-cr8-mode", "3d");
        tick();
        root._cr8ThreeApi = api;
      })
      .catch(function () {
        /* CDN unreachable or WebGL init failed after detection passed — fallback image stays visible */
        root.setAttribute("data-cr8-mode", "css-parallax");
      });

    return {
      pause: function () {
        if (root._cr8ThreeApi) root._cr8ThreeApi.setVisible(false);
      },
      resume: function () {
        if (root._cr8ThreeApi) root._cr8ThreeApi.setVisible(true);
      },
      setScrollProgress: function (p) {
        if (root._cr8ThreeApi) root._cr8ThreeApi.setScrollProgress(p);
      },
    };
  }

  function initHero3D(root) {
    var hero = root.querySelector("[data-cr8-hero]");
    var canvas = root.querySelector("[data-cr8-canvas]");
    if (!hero || !canvas) return null;

    var scene = null;
    var started = false;

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !started) {
            started = true;
            scene = initThreeScene(root, canvas, root.getAttribute("data-hero-image"));
          }
          if (scene) {
            if (entry.isIntersecting) scene.resume();
            else scene.pause();
          }
        });
      },
      { threshold: 0 }
    );
    io.observe(hero);

    document.addEventListener("visibilitychange", function () {
      if (!scene) return;
      if (document.hidden) scene.pause();
      else scene.resume();
    });

    return {
      setScrollProgress: function (p) {
        if (scene) scene.setScrollProgress(p);
      },
    };
  }

  /* ---------------- cart / buy block ---------------- */

  function initCart(root) {
    var form = root.querySelector("[data-cr8-buy-form]");
    var toast = root.querySelector("[data-cr8-toast]");
    var stickyBar = root.querySelector("[data-cr8-sticky-bar]");
    var toastTimer = null;

    function showToast(message) {
      if (!toast) return;
      toast.textContent = message;
      toast.hidden = false;
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(function () {
        toast.hidden = true;
      }, 2500);
    }

    function refreshCartBubble() {
      var bubble = document.getElementById("cart-icon-bubble");
      if (!bubble) return;
      fetch(window.location.pathname + "?sections=cart-icon-bubble")
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          if (data && data["cart-icon-bubble"]) {
            var doc = new DOMParser().parseFromString(data["cart-icon-bubble"], "text/html");
            var next = doc.getElementById("cart-icon-bubble");
            if (next) bubble.innerHTML = next.innerHTML;
          }
        })
        .catch(function () {});
    }

    if (!form) {
      /* No product selected in the schema; nothing to wire up */
      return;
    }

    var productJsonEl = root.querySelector("[data-cr8-product-json]");
    var productData = null;
    try {
      productData = productJsonEl ? JSON.parse(productJsonEl.textContent) : null;
    } catch (e) {
      productData = null;
    }

    var variantInput = form.querySelector("[data-cr8-variant-input]");
    var sellingPlanInput = form.querySelector("[data-cr8-selling-plan-input]");
    var toggle = form.querySelector("[data-cr8-purchase-toggle]");
    var priceOnetimeEl = form.querySelector("[data-cr8-price-onetime]");
    var priceSubscribeEl = form.querySelector("[data-cr8-price-subscribe]");
    var savingsBadgeEl = form.querySelector("[data-cr8-savings-badge]");
    var qtyInput = form.querySelector("[data-cr8-qty-input]");
    var statusEl = form.querySelector("[data-cr8-cart-status]");
    var submitBtn = form.querySelector("[data-cr8-add-to-cart]");
    var submitLabel = form.querySelector("[data-cr8-add-to-cart-label]");

    function currentVariant() {
      if (!productData || !variantInput) return null;
      var id = parseInt(variantInput.value, 10);
      return productData.variants.filter(function (v) {
        return v.id === id;
      })[0] || null;
    }

    function updatePrices() {
      var variant = currentVariant();
      if (!variant) return;

      if (priceOnetimeEl) {
        var sample = priceOnetimeEl.textContent;
        priceOnetimeEl.textContent = formatMoneyLike(variant.price, sample);
      }

      if (toggle && productData.sellingPlanGroupId) {
        var allocation = variant.sellingPlanAllocations.filter(function (a) {
          return a.sellingPlanGroupId === productData.sellingPlanGroupId;
        })[0];
        if (allocation && priceSubscribeEl) {
          var sampleForSub = priceOnetimeEl ? priceOnetimeEl.textContent : "";
          priceSubscribeEl.textContent = formatMoneyLike(allocation.price, sampleForSub);
          if (savingsBadgeEl && variant.price > 0) {
            var savings = Math.round(((variant.price - allocation.price) / variant.price) * 100);
            savingsBadgeEl.textContent = savings > 0 ? "Save " + savings + "%" : "";
          }
        }
      }
    }

    if (toggle) {
      var options = toggle.querySelectorAll("[data-cr8-purchase-option]");
      options.forEach(function (btn) {
        btn.addEventListener("click", function () {
          options.forEach(function (b) {
            b.classList.remove("is-active");
            b.setAttribute("aria-checked", "false");
          });
          btn.classList.add("is-active");
          btn.setAttribute("aria-checked", "true");

          var isSubscribe = btn.getAttribute("data-cr8-purchase-option") === "subscribe";
          if (sellingPlanInput) {
            if (isSubscribe) {
              var variant = currentVariant();
              var allocation =
                variant &&
                variant.sellingPlanAllocations.filter(function (a) {
                  return a.sellingPlanGroupId === productData.sellingPlanGroupId;
                })[0];
              sellingPlanInput.value = allocation ? allocation.sellingPlanId : "";
            } else {
              sellingPlanInput.value = "";
            }
          }
        });
      });
    }

    updatePrices();

    var qtyStepper = form.querySelector("[data-cr8-qty-stepper]");
    if (qtyStepper && qtyInput) {
      qtyStepper.querySelector("[data-cr8-qty-decrease]").addEventListener("click", function () {
        var min = parseInt(qtyInput.min, 10) || 1;
        qtyInput.value = Math.max(min, (parseInt(qtyInput.value, 10) || 1) - 1);
      });
      qtyStepper.querySelector("[data-cr8-qty-increase]").addEventListener("click", function () {
        var max = parseInt(qtyInput.max, 10) || 20;
        qtyInput.value = Math.min(max, (parseInt(qtyInput.value, 10) || 1) + 1);
      });
    }

    function setSubmitting(isSubmitting) {
      if (submitBtn) submitBtn.disabled = isSubmitting;
      if (submitLabel) submitLabel.textContent = isSubmitting ? "Adding…" : "Add to cart";
    }

    function addToCart() {
      setSubmitting(true);
      if (statusEl) {
        statusEl.textContent = "";
        statusEl.removeAttribute("data-state");
      }

      var formData = new FormData(form);
      if (sellingPlanInput && !sellingPlanInput.value) {
        formData.delete("selling_plan");
      }

      return fetch(form.action + ".js", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: formData,
      })
        .then(function (response) {
          return response.json().then(function (data) {
            if (!response.ok) throw new Error(data.description || data.message || "Could not add to cart.");
            return data;
          });
        })
        .then(function () {
          if (statusEl) {
            statusEl.textContent = "Added to cart.";
            statusEl.setAttribute("data-state", "success");
          }
          showToast("Added to cart");
          refreshCartBubble();
        })
        .catch(function (err) {
          if (statusEl) {
            statusEl.textContent = err.message || "Something went wrong. Please try again.";
            statusEl.setAttribute("data-state", "error");
          }
        })
        .finally(function () {
          setSubmitting(false);
        });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      addToCart();
    });

    if (stickyBar) {
      var stickyBtn = stickyBar.querySelector("[data-cr8-sticky-add-to-cart]");
      if (stickyBtn) {
        stickyBtn.addEventListener("click", function () {
          addToCart();
        });
      }

      var hero = root.querySelector("[data-cr8-hero]");
      var buySection = root.querySelector(".cr8-buy");
      var heroVisible = true;
      var buyVisible = false;

      var hideTimer = null;

      function updateStickyVisibility() {
        var shouldShow = !heroVisible && !buyVisible;
        window.clearTimeout(hideTimer);

        if (shouldShow) {
          stickyBar.hidden = false;
          window.requestAnimationFrame(function () {
            stickyBar.classList.add("is-visible");
          });
        } else {
          stickyBar.classList.remove("is-visible");
          hideTimer = window.setTimeout(function () {
            stickyBar.hidden = true;
          }, 300);
        }
      }

      if (hero) {
        new IntersectionObserver(function (entries) {
          heroVisible = entries[0].isIntersecting;
          updateStickyVisibility();
        }).observe(hero);
      }

      if (buySection) {
        new IntersectionObserver(function (entries) {
          buyVisible = entries[0].isIntersecting;
          updateStickyVisibility();
        }).observe(buySection);
      }
    }
  }

  /* ---------------- boot ---------------- */

  function initRoot(root) {
    var mode = getMode();
    root.setAttribute("data-cr8-mode", mode);

    var reducedMotion = mode === "static";
    var hero3D = mode === "3d" ? initHero3D(root) : null;

    initRevealAndParallax(root, mode, function (progress) {
      if (hero3D) hero3D.setScrollProgress(progress);
    });
    initScrollLinks(root, reducedMotion);
    initCart(root);
  }

  function boot() {
    document.querySelectorAll("[data-cr8-root]").forEach(initRoot);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  document.addEventListener("shopify:section:load", function (e) {
    var root = e.target.querySelector && e.target.querySelector("[data-cr8-root]");
    if (root) initRoot(root);
  });

  document.addEventListener("shopify:section:unload", function (e) {
    var root = e.target.querySelector && e.target.querySelector("[data-cr8-root]");
    if (root && root._cr8ThreeApi) root._cr8ThreeApi.dispose();
  });
})();

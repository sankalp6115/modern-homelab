import React, { useEffect, useRef, use } from 'react';
import { PlayerContext } from '../../contexts/PlayerContext';

const Oneko = () => {
    const { isOnekoEnabled } = use(PlayerContext);
    const nekoRef = useRef(null);

    useEffect(() => {
        if (!isOnekoEnabled) return;

        const nekoEl = document.createElement("div");
        nekoRef.current = nekoEl;

        let nekoPosX = 32;
        let nekoPosY = 32;
        let mousePosX = 0;
        let mousePosY = 0;
        let frameCount = 0;
        let idleTime = 0;
        let idleAnimation = null;
        let idleAnimationFrame = 0;
        let lastFrameTimestamp;
        let animationHandle;

        let windowWidth = window.innerWidth;
        let windowHeight = window.innerHeight;

        const nekoSpeed = 8;
        const spriteSets = {
            idle: [[-3, -3]],
            alert: [[-7, -3]],
            scratchSelf: [[-5, 0], [-6, 0], [-7, 0]],
            scratchWallN: [[0, 0], [0, -1]],
            scratchWallS: [[-7, -1], [-6, -2]],
            scratchWallE: [[-2, -2], [-2, -3]],
            scratchWallW: [[-4, 0], [-4, -1]],
            tired: [[-3, -2]],
            sleeping: [[-2, 0], [-2, -1]],
            N: [[-1, -2], [-1, -3]],
            NE: [[0, -2], [0, -3]],
            E: [[-3, 0], [-3, -1]],
            SE: [[-5, -1], [-5, -2]],
            S: [[-6, -3], [-7, -2]],
            SW: [[-5, -3], [-6, -1]],
            W: [[-4, -2], [-4, -3]],
            NW: [[-1, 0], [-1, -1]],
        };

        const handleResize = () => {
            windowWidth = window.innerWidth;
            windowHeight = window.innerHeight;
            nekoPosX = Math.min(nekoPosX, windowWidth - 16);
            nekoPosY = Math.min(nekoPosY, windowHeight - 16);
            nekoEl.style.transform = `translate(${nekoPosX - 16}px, ${nekoPosY - 16}px)`;
        };

        const init = () => {
            nekoEl.id = "oneko";
            nekoEl.style.cssText = `
                width: 32px;
                height: 32px;
                position: fixed;
                pointer-events: none;
                image-rendering: pixelated;
                z-index: 2147483647;
                background-image: url(/assets/images/icons/oneko.gif);
                left: 0px;
                top: 0px;
                transform: translate(${nekoPosX - 16}px, ${nekoPosY - 16}px);
            `;
            document.body.appendChild(nekoEl);

            const onMouseMove = (event) => {
                mousePosX = event.clientX;
                mousePosY = event.clientY;
            };
            document.addEventListener("mousemove", onMouseMove);
            window.addEventListener('resize', handleResize);

            const onAnimationFrame = (timestamp) => {
                if (!nekoEl.isConnected) return;
                if (!lastFrameTimestamp) lastFrameTimestamp = timestamp;
                if (timestamp - lastFrameTimestamp > 100) {
                    lastFrameTimestamp = timestamp;
                    frame();
                }
                animationHandle = window.requestAnimationFrame(onAnimationFrame);
            };
            animationHandle = window.requestAnimationFrame(onAnimationFrame);

            return () => {
                document.removeEventListener("mousemove", onMouseMove);
                window.removeEventListener('resize', handleResize);
                window.cancelAnimationFrame(animationHandle);
                if (nekoEl.isConnected) nekoEl.remove();
            };
        };

        const setSprite = (name, frame) => {
            const sprite = spriteSets[name][frame % spriteSets[name].length];
            nekoEl.style.backgroundPosition = `${sprite[0] * 32}px ${sprite[1] * 32}px`;
        };

        const resetIdleAnimation = () => {
            idleAnimation = null;
            idleAnimationFrame = 0;
        };

        const idle = () => {
            idleTime += 1;
            if (idleTime > 10 && Math.floor(Math.random() * 200) === 0 && idleAnimation === null) {
                let available = ["sleeping", "scratchSelf"];
                if (nekoPosX < 32) available.push("scratchWallW");
                if (nekoPosY < 32) available.push("scratchWallN");
                if (nekoPosX > windowWidth - 32) available.push("scratchWallE");
                if (nekoPosY > windowHeight - 32) available.push("scratchWallS");
                idleAnimation = available[Math.floor(Math.random() * available.length)];
            }

            switch (idleAnimation) {
                case "sleeping":
                    if (idleAnimationFrame < 8) { setSprite("tired", 0); break; }
                    setSprite("sleeping", Math.floor(idleAnimationFrame / 4));
                    if (idleAnimationFrame > 192) resetIdleAnimation();
                    break;
                case "scratchWallN": case "scratchWallS": case "scratchWallE": case "scratchWallW": case "scratchSelf":
                    setSprite(idleAnimation, idleAnimationFrame);
                    if (idleAnimationFrame > 9) resetIdleAnimation();
                    break;
                default:
                    setSprite("idle", 0);
                    return;
            }
            idleAnimationFrame += 1;
        };

        const frame = () => {
            frameCount += 1;
            const diffX = nekoPosX - mousePosX;
            const diffY = nekoPosY - mousePosY;
            const distance = Math.sqrt(diffX ** 2 + diffY ** 2);

            if (distance < nekoSpeed || distance < 48) {
                idle();
                return;
            }

            idleAnimation = null;
            idleAnimationFrame = 0;

            if (idleTime > 1) {
                setSprite("alert", 0);
                idleTime = Math.min(idleTime, 7);
                idleTime -= 1;
                return;
            }

            let direction = "";
            direction += diffY / distance > 0.5 ? "N" : "";
            direction += diffY / distance < -0.5 ? "S" : "";
            direction += diffX / distance > 0.5 ? "W" : "";
            direction += diffX / distance < -0.5 ? "E" : "";

            setSprite(direction, frameCount);

            nekoPosX -= (diffX / distance) * nekoSpeed;
            nekoPosY -= (diffY / distance) * nekoSpeed;
            nekoPosX = Math.min(Math.max(16, nekoPosX), windowWidth - 16);
            nekoPosY = Math.min(Math.max(16, nekoPosY), windowHeight - 16);

            nekoEl.style.transform = `translate(${nekoPosX - 16}px, ${nekoPosY - 16}px)`;
        };

        const cleanup = init();
        return () => {
            cleanup();
        };
    }, [isOnekoEnabled]);

    return null;
};

export default Oneko;
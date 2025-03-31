// bgImg is the background image to be modified.
// fgImg is the foreground image.
// fgOpac is the opacity of the foreground image.
// fgPos is the position of the foreground image in pixels. It can be negative and (0,0) means the top-left pixels of the foreground and background are aligned.
function composite( bgImg, fgImg, fgOpac, fgPos )
{
    const bgWidth = bgImg.width;
    const bgHeight = bgImg.height;
    const fgWidth = fgImg.width;
    const fgHeight = fgImg.height;
    const bgData = bgImg.data;
    const fgData = fgImg.data;

    for (let y = 0; y < fgHeight; y++) {
        for (let x = 0; x < fgWidth; x++) {
            const bgX = x + fgPos.x;
            const bgY = y + fgPos.y;

            if (bgX >= 0 && bgX < bgWidth && bgY >= 0 && bgY < bgHeight) {
                const fgIndex = (y * fgWidth + x) * 4;
                const bgIndex = (bgY * bgWidth + bgX) * 4;

                const fgR = fgData[fgIndex + 0];
                const fgG = fgData[fgIndex + 1];
                const fgB = fgData[fgIndex + 2];
                const fgA = fgData[fgIndex + 3] / 255; // scaling otherwise numbers are too low I think

                const bgR = bgData[bgIndex + 0];
                const bgG = bgData[bgIndex + 1];
                const bgB = bgData[bgIndex + 2];
                const bgA = bgData[bgIndex + 3] / 255;

                const scaledFgA = fgA * fgOpac; //scaling the opacity of the foreground image
                const outA = scaledFgA + bgA * (1 - scaledFgA);

                if (outA === 0) {
                    bgData[bgIndex + 0] = 0;
                    bgData[bgIndex + 1] = 0;
                    bgData[bgIndex + 2] = 0;
                    bgData[bgIndex + 3] = 0;
                } else {
                    const outR = (fgR * scaledFgA + (1 - scaledFgA)*bgR * bgA) / outA;
                    const outG = (fgG * scaledFgA + (1 - scaledFgA)*bgG * bgA) / outA;
                    const outB = (fgB * scaledFgA + (1 - scaledFgA)*bgB * bgA) / outA;

                    bgData[bgIndex + 0] = Math.round(outR);
                    bgData[bgIndex + 1] = Math.round(outG);
                    bgData[bgIndex + 2] = Math.round(outB);
                    bgData[bgIndex + 3] = Math.round(outA * 255);
                }
            }
        }
    }
}
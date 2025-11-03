document.addEventListener("DOMContentLoaded", () => {
    const socket = io();

    // Listen for ORB-SLAM frames
    socket.on("frame", (data) => {
        if (data.id !== undefined && data.image) {
            const feedIndex = data.id + 1; // backend sends 0-3, UI expects 1-4
            const imgEl = document.getElementById(`orb-feed-${feedIndex}`);
            if (imgEl) {
                imgEl.src = data.image;
            }
        }
    });
});

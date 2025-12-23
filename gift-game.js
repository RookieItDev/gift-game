// ========================================
// Gift Exchange Game - Sequential Gameplay
// ========================================

// Game State
let participants = [];
let playedParticipants = []; // คนที่หมุนไปแล้ว (ผู้เล่นที่หมุนวงล้อแล้ว)
let claimedGifts = []; // คนที่ของรางวัลถูกจับไปแล้ว (คนที่ถูกจับได้แล้ว)
let availableParticipants = []; // คนที่ยังไม่ได้หมุน
let currentPlayer = null; // คนที่กำลังหมุนในรอบนี้
let giftAssignments = []; // เก็บผลการจับของขวัญ [{player: "A", gift: "B"}]

// Wheel State
let wheelCanvas, wheelCtx;
let isSpinning = false;
let rotation = 0;

// Default participants
const defaultParticipants = [
    "1-คุณ A", "2-คุณ B", "3-คุณ C", "4-คุณ D", "5-คุณ E",
    "6-คุณ F", "7-คุณ G", "8-คุณ H", "9-คุณ I", "10-คุณ J",
    "11-คุณ K", "12-คุณ L", "13-คุณ M", "14-คุณ N", "15-คุณ O",
    "16-คุณ P", "17-คุณ Q", "18-คุณ R", "19-คุณ S", "20-คุณ T",
    "21-คุณ U", "22-คุณ V", "23-คุณ W", "24-คุณ X", "25-คุณ Y", "26-คุณ Z"
];

// ========================================
// Initialization
// ========================================

document.addEventListener('DOMContentLoaded', function () {
    wheelCanvas = document.getElementById('wheelCanvas');
    wheelCtx = wheelCanvas.getContext('2d');

    // Load participants
    loadParticipants();

    // Setup event listeners
    document.getElementById('spinBtn').addEventListener('click', handleSpinClick);
    document.getElementById('nameInput').addEventListener('input', handleNameInputChange);

    // Sync scrolling for line numbers
    setupLineNumberSync();

    // Draw initial wheel
    drawWheel();

    // Disable spin button initially (until game starts)
    document.getElementById('spinBtn').disabled = true;

    // Keyboard Control (Spacebar)
    document.addEventListener('keydown', function (event) {
        if (event.code === 'Space') {
            event.preventDefault(); // Prevent scrolling

            // 1. Check if Winner Modal is open -> Close it
            const winnerModal = document.getElementById('winnerModal');
            if (winnerModal.classList.contains('pointer-events-auto')) {
                // Check if button is ready (not hidden/disabled by animation delay)
                const btnContainer = document.getElementById('modalBtnContainer');
                if (btnContainer.classList.contains('pointer-events-auto')) {
                    closeModal();
                }
                return;
            }

            // 2. Check if Summary Modal is open -> Close it
            const summaryModal = document.getElementById('summaryModal');
            if (summaryModal.classList.contains('pointer-events-auto')) {
                closeSummary();
                return;
            }

            // 3. Check if Player Selection Modal is open -> Do nothing (user needs to click)
            const selectModal = document.getElementById('selectPlayerModal');
            if (selectModal.classList.contains('pointer-events-auto')) {
                return;
            }

            // 4. Spin the wheel
            const spinBtn = document.getElementById('spinBtn');
            if (!spinBtn.disabled && !spinBtn.classList.contains('hidden')) {
                handleSpinClick();
            }
        }
    });
});

// ========================================
// Participant Management
// ========================================

function loadParticipants() {
    const nameInput = document.getElementById('nameInput');
    nameInput.value = defaultParticipants.join('\n');
    updateParticipants();
}

function handleNameInputChange() {
    updateParticipants();
}

function updateParticipants() {
    const nameInput = document.getElementById('nameInput').value;
    participants = nameInput.split('\n')
        .map(name => name.trim())
        .filter(name => name.length > 0);

    // Update available participants (exclude already played)
    availableParticipants = participants.filter(p => !playedParticipants.includes(p));

    updateCountDisplay();
    updateLineNumbers();
    drawWheel();

    // Update player selection if modal is open
    if (document.getElementById('selectPlayerModal').classList.contains('pointer-events-auto')) {
        populatePlayerSelection();
    }
}

function updateCountDisplay() {
    document.getElementById('countDisplay').textContent = `${participants.length} คน`;
    document.getElementById('playedCount').textContent = playedParticipants.length;
    document.getElementById('remainingCount').textContent = availableParticipants.length;
}

function updateLineNumbers() {
    const nameInput = document.getElementById('nameInput');
    // Count lines correctly even if last line is empty
    const lines = nameInput.value.split('\n').length;
    const lineNumbersDiv = document.getElementById('nameLineNumbers');

    // Use divs for better control
    lineNumbersDiv.innerHTML = Array.from({ length: lines }, (_, i) =>
        `<div>${i + 1}</div>`
    ).join('');

    // Force sync scroll immediately
    lineNumbersDiv.scrollTop = nameInput.scrollTop;
}

function setupLineNumberSync() {
    const nameInput = document.getElementById('nameInput');
    const lineNumbers = document.getElementById('nameLineNumbers');

    nameInput.addEventListener('scroll', function () {
        lineNumbers.scrollTop = nameInput.scrollTop;
    });
}



// ========================================
// Player Selection Modal
// ========================================

function showPlayerSelectionModal() {
    const modal = document.getElementById('selectPlayerModal');
    const modalContent = modal.querySelector('.bg-white');
    const title = document.getElementById('selectModalTitle');
    const subtitle = document.getElementById('selectModalSubtitle');

    if (playedParticipants.length === 0) {
        // First player selection
        title.textContent = 'เลือกผู้เล่นคนแรก';
        subtitle.textContent = 'เลือกชื่อของคุณเพื่อเริ่มเกม';
    } else {
        // Next player selection (when previous winner already played)
        title.textContent = 'เลือกผู้เล่นคนต่อไป';
        subtitle.textContent = 'เลือกจากรายชื่อที่ยังไม่ได้หมุน';
    }

    populatePlayerSelection();

    // Show modal with animation
    modal.classList.remove('pointer-events-none', 'opacity-0');
    modal.classList.add('pointer-events-auto', 'opacity-100');
    modalContent.classList.remove('scale-90');
    modalContent.classList.add('scale-100');
}

function populatePlayerSelection() {
    const container = document.getElementById('playerSelectionList');
    container.innerHTML = '';

    let selectableParticipants;

    if (playedParticipants.length === 0) {
        // First player selection - show all participants
        selectableParticipants = participants;
    } else {
        // Subsequent selection - show only players whose gifts haven't been claimed yet
        selectableParticipants = participants.filter(p => !claimedGifts.includes(p));
        console.log('Selectable participants (unclaimed gifts):', selectableParticipants);
    }

    if (selectableParticipants.length === 0) {
        container.innerHTML = '<p class="col-span-2 text-center text-gray-500">ไม่มีผู้เล่นที่สามารถเลือกได้</p>';
        return;
    }

    selectableParticipants.forEach((name, index) => {
        const button = document.createElement('button');
        // Simplified button: no scale animation, smaller padding, smaller font
        button.className = 'px-3 py-2 bg-gradient-to-r from-pink-400 to-purple-500 text-white font-medium rounded-lg shadow-sm hover:bg-pink-500 hover:shadow-md transition-all text-sm truncate';
        button.innerHTML = `
            <div class="flex items-center justify-center gap-2">
                <span class="text-lg">👤</span>
                <span class="truncate">${name}</span>
            </div>
        `;
        button.onclick = () => selectPlayer(name);
        container.appendChild(button);
    });
}

function selectPlayer(name) {
    console.log('Selected player:', name);
    currentPlayer = name;
    document.getElementById('currentPlayerName').textContent = name;

    // Close modal with proper animation
    const modal = document.getElementById('selectPlayerModal');
    const modalContent = modal.querySelector('.bg-white');

    // Remove show classes and add hide classes
    modal.classList.remove('pointer-events-auto', 'opacity-100');
    modal.classList.add('pointer-events-none', 'opacity-0');
    modalContent.classList.remove('scale-100');
    modalContent.classList.add('scale-90');

    // Update wheel to exclude current player after modal closes
    setTimeout(() => {
        drawWheel();
    }, 300);

    // Enable spin button
    document.getElementById('spinBtn').disabled = false;
    console.log('Spin button enabled, current player:', currentPlayer);
}

// ========================================
// Wheel Drawing
// ========================================


function adjustColor(color, amount) {
    return '#' + color.replace(/^#/, '').replace(/../g, color => ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
}

function drawWheel() {
    const canvas = wheelCanvas;
    const ctx = wheelCtx;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = canvas.width / 2 - 20;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get available names (exclude current player and people whose gifts were claimed)
    let wheelNames;
    if (currentPlayer) {
        // Exclude: current player + people whose gifts are already claimed
        wheelNames = participants.filter(p =>
            p !== currentPlayer && !claimedGifts.includes(p)
        );

        // SPECIAL CASE: SWAP MODE (Last person deadlock)
        // If no unclaimed gifts left but player still needs to play? 
        // -> Show EVERYONE ELSE (Potential victims for swapping)
        if (wheelNames.length === 0 && participants.length > 0) {
            wheelNames = participants.filter(p => p !== currentPlayer);
            console.log('SWAP MODE ACTIVATED: Spinning with all participants');
        }

    } else {
        wheelNames = participants;
    }

    if (wheelNames.length === 0) {
        wheelNames = ['ไม่มีรายชื่อ'];
    }

    const sliceAngle = (2 * Math.PI) / wheelNames.length;

    // Color palette
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
        '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
        '#FF8FA3', '#6C5CE7', '#FD79A8', '#A29BFE', '#74B9FF'
    ];

    // Draw slices
    for (let i = 0; i < wheelNames.length; i++) {
        const startAngle = rotation + i * sliceAngle;
        const endAngle = startAngle + sliceAngle;

        // Draw slice
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();

        // 3D Effect: Radial Gradient
        const color = colors[i % colors.length];
        const gradient = ctx.createRadialGradient(centerX, centerY, 50, centerX, centerY, radius);
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.5, color);
        gradient.addColorStop(1, adjustColor(color, -60)); // Darker at edges

        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw border/Bevel
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2; // Thinner border for cleaner look
        ctx.stroke();

        // Add Inner Bevel (Highlight on one side)
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius - 2, startAngle, endAngle);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.restore();

        // Draw text
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + sliceAngle / 2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        // Adjust text position based on name length
        const textRadius = radius * 0.65;
        const name = wheelNames[i];

        // Smart font sizing
        let fontSize = 28;
        if (name.length > 20) fontSize = 18;
        else if (name.length > 12) fontSize = 22;
        else if (name.length > 8) fontSize = 24;

        ctx.font = `bold ${fontSize}px Kanit`;

        // Clip text if too long
        // Not implementing detailed clipping here to keep simple, just rely on font size
        ctx.fillText(name, textRadius, 0);

        ctx.restore();
    }

    // Draw center circle (Hub)
    ctx.beginPath();
    ctx.arc(centerX, centerY, 80, 0, 2 * Math.PI);

    // Metallic Hub Gradient
    const hubGradient = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, 80);
    hubGradient.addColorStop(0, '#ffffff');
    hubGradient.addColorStop(0.8, '#e0e0e0');
    hubGradient.addColorStop(1, '#a0a0a0');

    ctx.fillStyle = hubGradient;
    ctx.fill();

    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 8;
    ctx.stroke();
}

// ========================================
// Spinning Logic
// ========================================

function handleSpinClick() {
    if (isSpinning) return;
    if (!currentPlayer) {
        showPlayerSelectionModal();
        return;
    }

    startSpin();
}

function startSpin() {
    isSpinning = true;
    document.getElementById('spinBtn').disabled = true;
    initAudio(); // Initialize audio context on user interaction

    // Get available names (exclude current player AND people whose gifts are claimed)
    let wheelNames = participants.filter(p =>
        p !== currentPlayer && !claimedGifts.includes(p)
    );

    // Check for Swap Mode condition
    if (wheelNames.length === 0) {
        // Fallback to Swap Mode: Include everyone else
        wheelNames = participants.filter(p => p !== currentPlayer);
        console.log('Spinning in SWAP MODE');

        if (wheelNames.length === 0) {
            alert('ไม่มีผู้เล่นอื่นในรายชื่อเลย? (Error)');
            isSpinning = false;
            document.getElementById('spinBtn').disabled = false;
            return;
        }
    }

    // DISCO MODE ON
    document.getElementById('discoLayer').classList.remove('opacity-0');


    // Animation parameters (matching original game)
    const duration = 6000 + Math.random() * 2000; // 6-8 seconds
    const extraSpins = 5 + Math.random() * 5; // 5-10 full rotations
    const randomAngle = Math.random() * 2 * Math.PI;
    const targetRotation = rotation + (extraSpins * 2 * Math.PI) + randomAngle;

    const startRotation = rotation;
    const startTime = performance.now();
    let lastRotation = startRotation;

    // Pointer Animation State (Spring Physics)
    let pointerAngle = 0;
    let pointerVelocity = 0;
    const pointerEl = document.getElementById('wheelPointer');

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Quartic ease-out for smooth deceleration
        const ease = 1 - Math.pow(1 - progress, 4);

        // Update rotation
        rotation = startRotation + (targetRotation - startRotation) * ease;

        // Play tick sound when passing slice boundaries
        const sliceAngle = (2 * Math.PI) / wheelNames.length;
        const offset = Math.PI / 2;

        const currentTick = Math.floor((rotation + offset) / sliceAngle);
        const lastTick = Math.floor((lastRotation + offset) / sliceAngle);
        const ticksPassed = currentTick - lastTick;

        if (ticksPassed > 0) {
            playTickSound();
            // Add impulse velocity based on how many slices passed (capped)
            // Kick to the right (negative angle for this element)
            pointerVelocity -= 25 * Math.min(ticksPassed, 2);
        }
        lastRotation = rotation;

        // Spring Physics Simulation
        const stiffness = 0.5; // How strongly it pulls back
        const damping = 0.75;  // How much energy it loses (prevents infinite oscillation)

        // Acceleration towards center (0)
        const acceleration = (0 - pointerAngle) * stiffness;
        pointerVelocity += acceleration;
        pointerVelocity *= damping;
        pointerAngle += pointerVelocity;

        // Hard limits to prevent "over-spinning" and keep it within 90 degrees
        if (pointerAngle < -90) {
            pointerAngle = -90;
            pointerVelocity = 0;
        }
        if (pointerAngle > 10) { // Slight bounce past center to the left
            pointerAngle = 10;
            pointerVelocity *= -0.015; // Bounce back
        }

        if (pointerEl) {
            // Preservation of horizontal centering with translateX(-50%)
            pointerEl.style.transform = `translateX(-50%) rotate(${pointerAngle}deg)`;
        }

        drawWheel();

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // Spinning complete
            rotation = targetRotation;
            isSpinning = false;

            // Gently bring pointer back to 0 if it hasn't stopped
            if (pointerEl) pointerEl.style.transform = `translateX(-50%) rotate(0deg)`;

            drawWheel();
            handleSpinComplete();
        }
    }

    requestAnimationFrame(animate);
}

// function animateSpin removed (clean code)

function handleSpinComplete() {
    console.log('=== handleSpinComplete ===');
    console.log('Current player:', currentPlayer);

    // DISCO MODE OFF
    document.getElementById('discoLayer').classList.add('opacity-0');

    // Get available names (exclude current player AND people whose gifts are claimed)
    // Get available names logic must match startSpin
    let wheelNames = participants.filter(p =>
        p !== currentPlayer && !claimedGifts.includes(p)
    );

    let isSwapMode = false;
    if (wheelNames.length === 0) {
        // Swap Mode active: Use all participants except current
        wheelNames = participants.filter(p => p !== currentPlayer);
        isSwapMode = true;
        console.log('Calculating result in SWAP MODE (Last person deadlock fix)');
    }
    console.log('Wheel names for result calculation:', wheelNames);

    const sliceAngle = (2 * Math.PI) / wheelNames.length;

    // Normalize rotation
    let normalizedRotation = rotation % (2 * Math.PI);
    if (normalizedRotation < 0) normalizedRotation += 2 * Math.PI;

    // Calculate winner logic
    const pointerAngle = (3 * Math.PI / 2) - normalizedRotation;
    let adjustedAngle = pointerAngle % (2 * Math.PI);
    if (adjustedAngle < 0) adjustedAngle += 2 * Math.PI;

    const winnerIndex = Math.floor(adjustedAngle / sliceAngle) % wheelNames.length;
    const winner = wheelNames[winnerIndex];

    console.log('Winner index:', winnerIndex);
    console.log('Winner (gift owner):', winner);

    // Logic continues below...

    // IMPORTANT: Save current values before they get modified
    const playerWhoSpun = currentPlayer;
    let giftOwner = winner;
    let specialMessage = null;

    console.log('SAVING VALUES:', { playerWhoSpun, giftOwner, isSwapMode });

    if (isSwapMode) {
        // SWAP LOGIC: Player swaps gifts with Victim
        const victim = winner;
        const victimAssignment = giftAssignments.find(a => a.player === victim);

        if (victimAssignment) {
            const victimOldGift = victimAssignment.gift;

            // 1. Victim gets LastGuy's gift (which is named "LastGuy" aka playerWhoSpun)
            victimAssignment.gift = playerWhoSpun;

            // 2. LastGuy gets Victim's old gift
            giftOwner = victimOldGift;

            specialMessage = `(สลับของรางวัลกับ ${victim}!)`;
            console.log(`SWAPPED! ${playerWhoSpun} gets ${giftOwner} from ${victim}. ${victim} gets ${playerWhoSpun}`);

            // Update UI for victim
            updateResultInList(victim, playerWhoSpun);
        }
    }

    // Normal checks
    const giftAlreadyClaimed = claimedGifts.includes(winner);
    const winnerHasPlayed = playedParticipants.includes(winner);

    // Show result modal
    // In swap mode, force false for warnings because it is a valid move
    showWinnerModal(playerWhoSpun, giftOwner,
        isSwapMode ? false : giftAlreadyClaimed,
        isSwapMode ? false : winnerHasPlayed,
        specialMessage
    );

    // Add to results
    giftAssignments.push({
        player: playerWhoSpun,
        gift: giftOwner
    });
    console.log('Added assignment:', { player: playerWhoSpun, gift: giftOwner });

    // Add current player to played list
    if (!playedParticipants.includes(playerWhoSpun)) {
        playedParticipants.push(playerWhoSpun);
    }

    // Update claimed gifts
    if (isSwapMode) {
        // In swap mode, Player's gift is now taken by Victim
        if (!claimedGifts.includes(playerWhoSpun)) claimedGifts.push(playerWhoSpun);
        // Original gift of victim was already claimed, no change needed
    } else {
        if (!claimedGifts.includes(giftOwner)) claimedGifts.push(giftOwner);
    }

    // Update available participants
    availableParticipants = participants.filter(p => !playedParticipants.includes(p));
    updateCountDisplay();

    // Add to results list
    addResultToList(playerWhoSpun, giftOwner, specialMessage);

    // Confetti
    launchConfetti();
    playFanfare(); // Play win sound
}

// ========================================
// Winner Modal
// ========================================

function showWinnerModal(player, gift, giftAlreadyClaimed, winnerHasPlayed, note = null) {
    console.log('showWinnerModal:', player, 'got gift from', gift);
    const modal = document.getElementById('winnerModal');
    const modalContent = modal.querySelector('.bg-white');
    document.getElementById('modalCurrentPlayer').textContent = player;

    // Display gift name with optional note
    const giftText = document.getElementById('modalWinnerText');
    giftText.textContent = gift;

    // Remove existing note if any
    const existingNote = document.getElementById('modalWinnerNote');
    if (existingNote) existingNote.remove();

    // Add note if present
    if (note) {
        const noteEl = document.createElement('div');
        noteEl.id = 'modalWinnerNote';
        noteEl.className = 'text-xl text-red-500 font-bold mt-2 animate-pulse';
        noteEl.textContent = note;
        giftText.parentNode.appendChild(noteEl); // Append after gift text
    }

    modal.classList.remove('pointer-events-none', 'opacity-0');
    modal.classList.add('pointer-events-auto', 'opacity-100');
    modalContent.classList.remove('scale-90');
    modalContent.classList.add('scale-100');

    // Show buttons immediately
    const btnContainer = document.getElementById('modalBtnContainer');
    btnContainer.classList.remove('opacity-0', 'pointer-events-none');
    btnContainer.classList.add('opacity-100', 'pointer-events-auto');
    console.log('Buttons enabled immediately');

    // Determine next player
    if (giftAlreadyClaimed || winnerHasPlayed) {
        // Condition 1: Gift was already claimed (impossible now with filter, but safe logic)
        // Condition 2: The person who owns this gift has ALREADY PLAYED their turn
        // In either case -> We must select a NEW player
        currentPlayer = null;
        console.log('Next player selection needed because:',
            giftAlreadyClaimed ? 'Gift already claimed' : 'Winner already played');
    } else {
        // Gift owner becomes next player (they will spin next)
        currentPlayer = gift;
        document.getElementById('currentPlayerName').textContent = gift;
        console.log('Next player will be:', gift, '(the gift owner)');
    }
}

function closeModal() {
    console.log('closeModal called');
    const modal = document.getElementById('winnerModal');
    const modalContent = modal.querySelector('.bg-white');
    const btnContainer = document.getElementById('modalBtnContainer');

    // Reset button container state
    btnContainer.classList.remove('opacity-100', 'pointer-events-auto');
    btnContainer.classList.add('opacity-0', 'pointer-events-none');

    // Hide modal
    modal.classList.remove('pointer-events-auto', 'opacity-100');
    modal.classList.add('pointer-events-none', 'opacity-0');
    modalContent.classList.remove('scale-100');
    modalContent.classList.add('scale-90');

    // Check if game is complete
    if (playedParticipants.length >= participants.length) {
        console.log('Game complete, showing summary');
        setTimeout(() => {
            showSummary();
        }, 500);
        return;
    }

    // If current player is null (gift owner already played), show selection modal
    if (!currentPlayer) {
        console.log('No current player, showing selection modal');
        setTimeout(() => {
            showPlayerSelectionModal();
        }, 500);
    } else {
        // Enable spin for next player
        console.log('Next player:', currentPlayer);
        document.getElementById('spinBtn').disabled = false;
        drawWheel();
    }
}

// ========================================
// Audio System
// ========================================

let audioContext;
let isSoundEnabled = true;

function initAudio() {
    if (audioContext) return;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.log('Web Audio API not supported');
        isSoundEnabled = false;
    }
}

function playTickSound() {
    if (!isSoundEnabled || !audioContext) return;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);

    // Improved Tick Sound: Sharper, plastic-like click with pitch variation
    // Base pitch 800Hz, plus random variation +/- 100Hz for realism
    const pitch = 800 + (Math.random() * 200 - 100);

    osc.frequency.value = pitch;
    osc.type = 'triangle';

    // Very short envelope for percussive effect
    const now = audioContext.currentTime;
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.start(now);
    osc.stop(now + 0.05);
}

function playFanfare() {
    if (!isSoundEnabled || !audioContext) return;

    const now = audioContext.currentTime;

    // Helper to play a single note
    const playNote = (freq, type, duration, time, volume = 0.1) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = freq;
        osc.type = type;
        gain.gain.setValueAtTime(volume, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc.start(time);
        osc.stop(time + duration);
    };

    // Notes Frequencies (C Major)
    const C4 = 261.63, E4 = 329.63, G4 = 392.00;
    const C5 = 523.25, E5 = 659.25, G5 = 783.99, A5 = 880.00, B5 = 987.77, C6 = 1046.50;

    // 1. Rapid Ascending Arpeggio (The "Magic" buildup)
    const run = [C4, E4, G4, C5, E5, G5, C6];
    let t = now;
    run.forEach((freq, i) => {
        // use square for retro game feel, very short duration
        playNote(freq, 'square', 0.1, t + (i * 0.06), 0.05);
    });

    t += (run.length * 0.06);

    // 2. Grand Chord Hits (The "Victory" Impact)
    const chord = [C5, E5, G5, C6]; // C Major chord high

    // Hit 1
    chord.forEach(f => playNote(f, 'triangle', 0.3, t, 0.08));
    playNote(C4, 'sawtooth', 0.3, t, 0.1); // Bass
    t += 0.25;

    // Hit 2
    chord.forEach(f => playNote(f, 'triangle', 0.3, t, 0.08));
    playNote(G4, 'sawtooth', 0.3, t, 0.1); // Bass
    t += 0.25;

    // 3. Final Long Chord (The "Glory")
    // Longer duration, vibrato effect simulated by beating if we add slight detune
    chord.forEach(f => playNote(f, 'triangle', 2.0, t, 0.1));
    playNote(C4 / 2, 'sawtooth', 2.0, t, 0.15); // Deep Bass C3

    // Optional: High twinkle at the end
    setTimeout(() => {
        if (audioContext.state === 'running') {
            playNote(C6 * 1.5, 'sine', 0.5, audioContext.currentTime, 0.05); // G6
        }
    }, (t - now + 0.5) * 1000);
}


// ========================================
// Results Display
// ========================================

function addResultToList(player, gift, note = null) {
    console.log('addResultToList called:', { player, gift, note });

    // Validate inputs
    if (!player || !gift) {
        console.error('Invalid result:', { player, gift });
        return;
    }

    const resultsList = document.getElementById('resultsList');
    const noResultsMessage = document.getElementById('noResultsMessage');
    const resultsListContainer = document.getElementById('resultsListContainer');

    // Hide "no results" message and show results list
    noResultsMessage.classList.add('hidden');
    resultsListContainer.classList.remove('hidden');

    // Create result item (add to top)
    const li = document.createElement('li');
    li.className = 'bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-4 shadow-sm border-2 border-pink-200 animate-fadeIn';
    li.innerHTML = `
        <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-gray-500">ผู้เล่น</span>
            <span class="text-sm font-bold text-pink-600">${player}</span>
        </div>
        <div class="flex items-center justify-between">
            <span class="text-xs text-gray-500">จับได้ของของ</span>
            <div class="text-right">
                <span class="text-sm font-bold text-purple-600 block">${gift}</span>
                ${note ? `<span class="text-xs text-red-500 font-medium">${note}</span>` : ''}
            </div>
        </div>
    `;

    // Insert at the beginning (most recent first)
    resultsList.insertBefore(li, resultsList.firstChild);
}

function updateResultInList(player, newGift) {
    // Find the list item corresponding to the player and update the gift
    const resultsList = document.getElementById('resultsList');
    const items = resultsList.getElementsByTagName('li');

    for (let li of items) {
        // Simple text check, assuming format matches
        if (li.innerHTML.includes(`>${player}<`)) {
            // Found the player's LI, now update the gift part
            // We'll just append a (Swapped) note or update the text
            const giftSpan = li.querySelector('.text-purple-600');
            if (giftSpan) {
                giftSpan.textContent = newGift;
                // Add swap indicator if not present
                if (!li.innerHTML.includes('text-red-500')) {
                    const container = giftSpan.parentElement; // div.text-right
                    const noteSpan = document.createElement('span');
                    noteSpan.className = 'text-xs text-red-500 font-medium block';
                    noteSpan.textContent = '(โดนสลับ)';
                    container.appendChild(noteSpan);
                }
            }
            break;
        }
    }
}

// ========================================
// Summary Modal
// ========================================

function showSummary() {
    const modal = document.getElementById('summaryModal');
    const modalContent = modal.querySelector('.bg-white');
    const tableBody = document.getElementById('summaryTableBody');

    tableBody.innerHTML = '';

    // Show results in order (most recent first)
    const reversedAssignments = [...giftAssignments].reverse();
    reversedAssignments.forEach((assignment, index) => {
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'bg-pink-50' : 'bg-purple-50';
        row.innerHTML = `
            <td class="p-4 font-semibold text-gray-700">${assignment.player}</td>
            <td class="p-4 font-semibold text-purple-600">${assignment.gift}</td>
        `;
        tableBody.appendChild(row);
    });

    modal.classList.remove('pointer-events-none', 'opacity-0');
    modal.classList.add('pointer-events-auto', 'opacity-100');
    modalContent.classList.remove('scale-90');
    modalContent.classList.add('scale-100');
}

function closeSummary() {
    const modal = document.getElementById('summaryModal');
    const modalContent = modal.querySelector('.bg-white');

    modal.classList.remove('pointer-events-auto', 'opacity-100');
    modal.classList.add('pointer-events-none', 'opacity-0');
    modalContent.classList.remove('scale-100');
    modalContent.classList.add('scale-90');
}

// ========================================
// Reset Functions Logic
// ========================================

// ========================================
// Reset Functions removed as requested
// ========================================

function resetDefaults() {
    if (!confirm('ต้องการคืนค่ารายชื่อเริ่มต้นใช่หรือไม่?')) return;
    loadParticipants();
}

// ========================================
// Game Start
// ========================================

function startGame() {
    initAudio(); // Initialize audio system
    // Validate participants
    if (participants.length < 2) {
        alert('กรุณาใส่รายชื่อผู้เข้าร่วมอย่างน้อย 2 คน');
        return;
    }

    console.log('Starting game with', participants.length, 'participants');

    // Hide start game button, show toggle button
    document.getElementById('startGameBtn').classList.add('hidden');
    document.getElementById('toggleControlsBtn').classList.remove('hidden');

    // Hide controls panel
    const controlsPanel = document.getElementById('controlsPanel');
    const showBtn = document.getElementById('showControlsBtn');

    controlsPanel.classList.add('hidden');
    showBtn.classList.remove('hidden');

    // Show player selection modal
    setTimeout(() => {
        showPlayerSelectionModal();
    }, 300);
}

// ========================================
// UI Controls
// ========================================

function toggleControls() {
    const controlsPanel = document.getElementById('controlsPanel');
    const showBtn = document.getElementById('showControlsBtn');

    if (controlsPanel.classList.contains('hidden')) {
        // Show controls panel
        controlsPanel.classList.remove('hidden');
        showBtn.classList.add('hidden');
    } else {
        // Hide controls panel
        controlsPanel.classList.add('hidden');
        showBtn.classList.remove('hidden');
    }
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

function editEventTitle() {
    const titleText = document.getElementById('eventTitleText');
    const currentTitle = titleText.textContent;
    const newTitle = prompt('แก้ไขชื่องาน:', currentTitle);
    if (newTitle && newTitle.trim()) {
        titleText.textContent = newTitle.trim();
    }
}

// ========================================
// Confetti Animation
// ========================================

function launchConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const confettiPieces = [];
    const confettiCount = 150;
    const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3'];

    for (let i = 0; i < confettiCount; i++) {
        confettiPieces.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            w: Math.random() * 10 + 5,
            h: Math.random() * 10 + 5,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * 360,
            rotationSpeed: Math.random() * 10 - 5,
            velocityY: Math.random() * 3 + 2,
            velocityX: Math.random() * 4 - 2
        });
    }

    function drawConfetti() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        confettiPieces.forEach((piece, index) => {
            ctx.save();
            ctx.translate(piece.x, piece.y);
            ctx.rotate((piece.rotation * Math.PI) / 180);
            ctx.fillStyle = piece.color;
            ctx.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h);
            ctx.restore();

            piece.y += piece.velocityY;
            piece.x += piece.velocityX;
            piece.rotation += piece.rotationSpeed;

            if (piece.y > canvas.height) {
                confettiPieces.splice(index, 1);
            }
        });

        if (confettiPieces.length > 0) {
            requestAnimationFrame(drawConfetti);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    drawConfetti();
}

// ========================================
// Window Resize Handler
// ========================================

window.addEventListener('resize', () => {
    drawWheel();
});

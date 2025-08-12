document.addEventListener('DOMContentLoaded', () => {
    // --- IIFE to encapsulate game logic and avoid global scope pollution ---
    const game = (() => {
        
        // --- STATE ---
        // Centralized state object to manage the entire game
        const state = {
            board: Array(9).fill(null),
            currentPlayer: 'X',
            mode: 'twoPlayers', // 'twoPlayers' or 'vsComputer'
            difficulty: 'easy', // 'easy' or 'unbeatable'
            gameOver: false,
            scores: { X: 0, O: 0, Draw: 0 },
            moveHistory: [], // Stores { index, player } for robust undo
        };

        // --- DOM SELECTORS ---
        // Caching all necessary DOM elements for performance
        const selectors = {
            board: document.querySelector('.board'),
            statusPanel: document.querySelector('.status-panel'),
            newGameBtn: document.querySelector('#newGameBtn'),
            undoBtn: document.querySelector('#undoBtn'),
            popup: document.getElementById('popup'),
            popupMessage: document.getElementById('popupMessage'),
            popupNewGameBtn: document.getElementById('popupNewGameBtn'),
            modeInputs: document.querySelectorAll('input[name="mode"]'),
            difficultyInputs: document.querySelectorAll('input[name="difficulty"]'),
            difficultyControls: document.getElementById('difficulty-controls'),
        };

        // --- WINNING COMBINATIONS ---
        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
            [0, 4, 8], [2, 4, 6]             // diagonals
        ];

        // --- CORE GAME LOGIC ---
        
        /**
         * Places a mark on the board and updates the game state.
         * @param {number} index - The cell index to place the mark.
         * @param {string} player - The player ('X' or 'O') making the move.
         */
        const makeMove = (index, player) => {
            if (state.board[index] || state.gameOver) return;

            state.board[index] = player;
            state.moveHistory.push({ index, player });
            
            if (checkWin(player)) {
                state.scores[player]++;
                endGame(`${player} Wins!`);
            } else if (state.board.every(cell => cell)) {
                state.scores.Draw++;
                endGame("It's a Draw!");
            } else {
                state.currentPlayer = state.currentPlayer === 'X' ? 'O' : 'X';
            }
            
            render();

            // Trigger computer move if applicable
            if (state.mode === 'vsComputer' && state.currentPlayer === 'O' && !state.gameOver) {
                setTimeout(computerMove, 400); // Small delay for UX
            }
        };

        /**
         * Checks if the current player has won.
         * @param {string} player - The player to check for a win.
         * @returns {boolean} - True if the player has won, false otherwise.
         */
        const checkWin = (player) => {
            return winPatterns.some(combination => 
                combination.every(index => state.board[index] === player)
            );
        };

        /**
         * Ends the game and displays the result popup.
         * @param {string} message - The message to display (e.g., "X Wins!").
         */
        const endGame = (message) => {
            state.gameOver = true;
            selectors.popupMessage.textContent = message;
            selectors.popup.classList.remove('hidden');
        };

        /**
         * Resets the game to its initial state for a new round.
         */
        const newGame = () => {
            state.board.fill(null);
            state.currentPlayer = 'X';
            state.moveHistory = [];
            state.gameOver = false;
            selectors.popup.classList.add('hidden');
            render();
        };

        /**
         * Reverts the last move(s). In AI mode, it undoes both the player's and AI's move.
         */
        const undoMove = () => {
            if (state.moveHistory.length === 0 || state.gameOver) return;

            const undoCount = (state.mode === 'vsComputer' && state.moveHistory.length > 1) ? 2 : 1;
            
            for (let i = 0; i < undoCount; i++) {
                const lastMove = state.moveHistory.pop();
                if (lastMove) {
                    state.board[lastMove.index] = null;
                }
            }
            
            // Set current player based on the last player in history, or default to 'X'
            state.currentPlayer = state.moveHistory.length > 0
                ? (state.moveHistory[state.moveHistory.length - 1].player === 'X' ? 'O' : 'X')
                : 'X';

            render();
        };

        // --- AI LOGIC ---

        const computerMove = () => {
            selectors.board.style.pointerEvents = 'none'; // Disable player clicks during AI's turn
            
            const moveIndex = state.difficulty === 'unbeatable' 
                ? getBestMove() 
                : getEasyMove();
            
            setTimeout(() => {
                makeMove(moveIndex, 'O');
                selectors.board.style.pointerEvents = 'auto'; // Re-enable clicks
            }, 200);
        };

        const getEasyMove = () => {
            const emptyCells = state.board
                .map((val, index) => val === null ? index : null)
                .filter(val => val !== null);
            return emptyCells[Math.floor(Math.random() * emptyCells.length)];
        };

        const getBestMove = () => {
            return minimax(state.board, 'O', -Infinity, Infinity).index;
        };

        /**
         * The Minimax algorithm with Alpha-Beta Pruning for unbeatable AI.
         * @param {Array} currentBoard - The current board state.
         * @param {string} player - The player whose turn it is.
         * @param {number} alpha - The best value for the maximizer.
         * @param {number} beta - The best value for the minimizer.
         * @returns {object} - An object containing the best score and move index.
         */
        const minimax = (currentBoard, player, alpha, beta) => {
            const emptyCells = currentBoard
                .map((val, i) => val === null ? i : null)
                .filter(val => val !== null);

            if (checkWinOnBoard(currentBoard, 'X')) return { score: -10 };
            if (checkWinOnBoard(currentBoard, 'O')) return { score: 10 };
            if (emptyCells.length === 0) return { score: 0 };
            
            let moves = [];

            for (let i = 0; i < emptyCells.length; i++) {
                let move = {};
                move.index = emptyCells[i];
                currentBoard[emptyCells[i]] = player;

                if (player === 'O') {
                    let result = minimax(currentBoard, 'X', alpha, beta);
                    move.score = result.score;
                    alpha = Math.max(alpha, move.score);
                } else {
                    let result = minimax(currentBoard, 'O', alpha, beta);
                    move.score = result.score;
                    beta = Math.min(beta, move.score);
                }

                currentBoard[emptyCells[i]] = null; // Backtrack
                moves.push(move);

                // Alpha-beta pruning
                if (alpha >= beta) break;
            }

            let bestMove;
            if (player === 'O') {
                let bestScore = -Infinity;
                for (let i = 0; i < moves.length; i++) {
                    if (moves[i].score > bestScore) {
                        bestScore = moves[i].score;
                        bestMove = i;
                    }
                }
            } else {
                let bestScore = Infinity;
                for (let i = 0; i < moves.length; i++) {
                    if (moves[i].score < bestScore) {
                        bestScore = moves[i].score;
                        bestMove = i;
                    }
                }
            }
            return moves[bestMove];
        };

        // A helper for minimax to check wins on a hypothetical board
        const checkWinOnBoard = (board, player) => {
            return winPatterns.some(combination => 
                combination.every(index => board[index] === player)
            );
        };

        // --- RENDERING / UI UPDATES ---
        
        /**
         * Renders the entire UI based on the current state.
         */
        const render = () => {
            // Render Board
            selectors.board.innerHTML = '';
            state.board.forEach((value, index) => {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                if (value) {
                    cell.classList.add(value.toLowerCase());
                    cell.textContent = value;
                }
                cell.dataset.index = index;
                selectors.board.appendChild(cell);
            });

            // Render Status Panel
            if (state.gameOver) {
                selectors.statusPanel.textContent = `Game Over! Score: X ${state.scores.X} - O ${state.scores.O}`;
            } else {
                selectors.statusPanel.textContent = `${state.currentPlayer}'s Turn | X: ${state.scores.X} | O: ${state.scores.O} | Draws: ${state.scores.Draw}`;
            }

            // Update Button States
            selectors.undoBtn.disabled = state.moveHistory.length === 0 || state.gameOver;
            
            // Show/Hide Difficulty Controls
            selectors.difficultyControls.style.display = state.mode === 'vsComputer' ? 'flex' : 'none';
        };

        // --- EVENT LISTENERS ---
        
        /**
         * Initializes all event listeners for the game.
         */
        const bindEvents = () => {
            selectors.board.addEventListener('click', (e) => {
                if (e.target.classList.contains('cell')) {
                    const index = parseInt(e.target.dataset.index, 10);
                    makeMove(index, state.currentPlayer);
                }
            });

            selectors.newGameBtn.addEventListener('click', () => {
                state.scores = { X: 0, O: 0, Draw: 0 }; // Reset scores on full new game
                newGame();
            });
            
            selectors.popupNewGameBtn.addEventListener('click', newGame); // Play Again keeps scores
            
            selectors.undoBtn.addEventListener('click', undoMove);

            selectors.modeInputs.forEach(input => {
                input.addEventListener('change', (e) => {
                    state.mode = e.target.value;
                    newGame(); // Reset board when mode changes
                });
            });

            selectors.difficultyInputs.forEach(input => {
                input.addEventListener('change', (e) => {
                    state.difficulty = e.target.value;
                    newGame(); // Reset board when difficulty changes
                });
            });
        };

        // --- INITIALIZATION ---
        
        /**
         * Kicks off the game.
         */
        const init = () => {
            console.log("Tic-Tac-Toe Enhanced Initialized!");
            bindEvents();
            render();
        };

        // Publicly expose only the init function
        return { init };
    })();

    // Start the game!
    game.init();
});
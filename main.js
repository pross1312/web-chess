const COLOR = {
    BLACK: 1,
    WHITE: 0,
};
const PIECE_TYPE = {
    PAWN: 0b10,
    BISHOP: 0b100,
    KNIGHT: 0b110,
    ROOK: 0b1000,
    QUEEN: 0b1010,
    KING: 0b1100,
    NONE: 0,
};
const MOVE = {
    NORMAL: 0,
    CAPTURE: 1,
    ENPASSANT: 2,
    CASTLE: 3,
    PAWN_DOUBLE_ADVANCE: 4,
};
// ----------------------------------------------
// GLOBAL variable
let Chess_board      = new Board();
let Current_turn     = {count: 0, color: COLOR.WHITE};
let Dragging_piece   = null;
let Moving_piece     = null;
let Clocks           = [document.getElementById("white-clock"), document.getElementById("black-clock")];
let Time_left        = [300, 300];
let Current_clock    = null;
let Drag_square      = null;
let rematch_button   = document.getElementById("rematch-button");
let game_end_popup   = document.getElementById("game-end-popup");
let game_end_region  = document.getElementById("game-end-region");
let turn_text        = document.getElementById("turn-text");
// ----------------------------------------------
// support utils
function oppose_color(color) { return 1 - color; }
display_time(); // show time on clock
rematch_button.onclick = function() {
    Chess_board = new Board();
    Time_left = [300, 300];
    Current_turn = {count: 0, color: COLOR.WHITE};
    Clocks[COLOR.WHITE].classList.remove("inactive");
    Clocks[COLOR.BLACK].classList.remove("inactive");
    game_end_region.style.zIndex = -1;
    game_end_popup.classList.toggle("show");
    display_time();
}
function game_end(winner_color) {
    if (Current_clock) window.clearInterval(Current_clock);
    Clocks[COLOR.WHITE].classList.add("inactive");
    Clocks[COLOR.BLACK].classList.add("inactive");
    if (winner_color == COLOR.BLACK) game_end_popup.childNodes[0].textContent = "Black win";
    else game_end_popup.childNodes[0].textContent = "White win";
    game_end_region.style.zIndex = 1;
    game_end_popup.classList.toggle("show");
}
function display_time() {
    function pad(num, size){ return ('000000000' + num).substr(-size); }
    Clocks[0].innerText = pad(parseInt(Time_left[0]/60), 2) + ":" + pad(parseInt(Time_left[0]%60), 2);
    Clocks[1].innerText = pad(parseInt(Time_left[1]/60), 2) + ":" + pad(parseInt(Time_left[1]%60), 2);
}
function start_clock(color) {
    Clocks[color].classList.remove("inactive");
    Clocks[oppose_color(color)].classList.add("inactive");
    return window.setInterval(function() {
        Time_left[color]--;
        display_time();
        if (Time_left[color] == 0) game_end(oppose_color(color));
    }, 1000);
}
function change_turn()       {
    if (Current_clock) window.clearInterval(Current_clock);
    Current_turn = {
        count: Current_turn.count + 1,
        color: 1 - Current_turn.color,
    };
    Current_clock = start_clock(Current_turn.color);
    if (Current_turn.color == COLOR.BLACK) {
        turn_text.innerText = "Black to move"
    } else {
        turn_text.innerText = "White to move"
    }
}
function Cell(r, c) { this.row = r; this.col = c; }
// ----------------------------------------------
function Piece(type, r, c) {
    function get_color(piece)    { if (piece == null || piece == PIECE_TYPE.NONE) return null; return piece & 1; }
    function get_type(piece)     { return piece & (~1); }
    this.has_moved = false;
    this.row = r;
    this.col = c;
    this.cell = function() { return new Cell(this.row, this.col); };
    this.type = type;
    this.color = function() { return get_color(this.type); }
    this.piece_type = function() { return get_type(this.type); }
    this.name = "";
    this.moves = [];
    if (this.color() == COLOR.BLACK) this.name += "b";
    else this.name += "w";
    switch (get_type(type)) {
        case PIECE_TYPE.PAWN  : this.name += "p"; break;
        case PIECE_TYPE.BISHOP: this.name += "b"; break;
        case PIECE_TYPE.KNIGHT: this.name += "n"; break;
        case PIECE_TYPE.ROOK  : this.name += "r"; break;
        case PIECE_TYPE.QUEEN : this.name += "q"; break;
        case PIECE_TYPE.KING  : this.name += "k"; break;
        default:
    }
    this.display = document.createElement("img");
    this.display.src = "./images/" + this.name + ".png";
    this.display.draggable = true;
    this.square = function() { return Chess_board.get_square(this.row, this.col); }
    this.display.piece = this;
    this.display.onmousedown = piece_mouse_down;
    this.display.ondragstart = piece_drag_start;
    this.display.onmouseup = piece_mouse_up;
    this.move = function(move) {
        this.row = move.to.row;
        this.col = move.to.col;
        this.display.style.transform = "none";
        if (move.type == MOVE.CAPTURE || move.type == MOVE.ENPASSANT) {
            Chess_board.remove(move.target);
        } else if (move.type == MOVE.CASTLE) {
            let rook_new_col = move.to.col == 6 ? 5 : 2;
            move.target.move(new Move(move.target, Chess_board.get_square(move.to.row, rook_new_col), MOVE.NORMAL));
        }
        this.has_moved = true;
        move.from.removeChild(this.display);
        move.to.appendChild(this.display);
        this.moves.push(move);

        // check for checking
        let oppose_king = Chess_board.find(oppose_color(this.color()) | PIECE_TYPE.KING)[0];
        if (is_square_in_attack(oppose_king.color(), oppose_king.cell())) {
            oppose_king.square().classList.add("in-check");
            let escapses = get_possible_moves(oppose_king).filter(is_legal_move);
            console.log(escapses);
            let has_move_left = false;
            for (let type in PIECE_TYPE) {
                if (type == "NONE") break;
                let check_piece = Chess_board.find(oppose_king.color() | PIECE_TYPE[type]);
                if (check_piece == null) console.log(oppose_king.color(), type);
                for (let p of check_piece) if (get_possible_moves(p).filter(is_legal_move).length != 0) {
                    has_move_left = true;
                    break;
                }
                if (has_move_left) break;
            }
            console.log(escapses.length);
            if (escapses.length == 0 && !has_move_left) game_end(move.mover.color());
        }
        if (this.piece_type() == PIECE_TYPE.KING) {
            move.from.classList.remove("in-check");
        } else {
            let my_king = Chess_board.find(this.color() | PIECE_TYPE.KING)[0];
            if (is_square_in_attack(my_king.color(), my_king.cell())) my_king.square().classList.add("in-check");
            else my_king.square().classList.remove("in-check");
        }
    }
    this.last_move = function() { return this.moves[this.moves.length-1]; }
}

function Move(piece, to_square, type) {
    this.turn_count = Current_turn.count;
    this.mover = piece;
    this.from = piece.square();
    this.to = to_square;
    this.type = type;
    this.target = null;
    if (type == MOVE.CAPTURE) {
        this.target = this.to.piece();
    } else if (type == MOVE.ENPASSANT) {
        let forward = this.mover.color() == COLOR.WHITE ? -1 : 1;
        this.target = Chess_board.get(this.to.row - forward, this.to.col);
        console.assert(this.target != null && this.target.color() == oppose_color(this.mover.color()));
    } else if (type == MOVE.CASTLE) {
        if (this.to.col == 1) this.target = Chess_board.get(this.mover.row, 0);
        else if (this.to.col == 6) this.target = Chess_board.get(this.mover.row, 7);
        else alert("Unknown castle pos", this.to.col);
    }
}


function Board() {
    this.grid = document.getElementById("chess-board");
    this.grid.innerText = "";
    this.cell_size = parseInt(this.grid.offsetWidth/8);
    this.get_square = function(r, c) {
        if (r >= 8 || r < 0 || c >= 8 || c < 0) return null;
        return this.grid.children[r * 8 + c];
    };
    this.square_at_coord = function(x, y) {
        let dx = x - this.grid.offsetLeft;
        let dy = y - this.grid.offsetTop;
        let r = parseInt(dy/this.cell_size);
        let c = parseInt(dx/this.cell_size);
        return this.get_square(r, c);
    }
    this.pieces = {};
    this.find = function(type) {
        return this.pieces[type.toString()];
    }
    this.get = function(r, c) { return this.get_square(r, c).piece(); }
    this.removed_pieces = [];
    this.add = function(piece) { this.pieces[piece.type].push(piece); }
    this.remove = function(piece) {
        this.removed_pieces.push(piece);
        piece.square().removeChild(piece.display);
        let index = this.find(piece.type).indexOf(piece);
        if (index == -1) alert("CAN'T REMOVE");
        this.find(piece.type).splice(index, 1);
    }
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            let square = document.createElement("div");
            square.classList.toggle("square");
            this.grid.appendChild(square);
            square.img = function() { return this.getElementsByTagName("img")[0] }
            square.has_piece = function() { return this.img() != null }
            square.piece = function() { return square.img() == null ? null : square.img().piece }
            square.row = r;
            square.col = c;
            square.onmousedown = square_mouse_down;
            square.onmouseenter = function(e) { if (Moving_piece) square_mark(this); };
            square.onmouseleave = function(e) { if (Moving_piece) square_unmark(this); };
            if ((r+c) % 2 == 0) {
                square.classList.toggle("black");
                square.color = "black";
            } else {
                square.classList.toggle("white");
                square.color = "white";
            }
        }
    }
    function parse_char(c) {
        let piece = PIECE_TYPE.NONE;
        if (c.toUpperCase() == c) piece |= COLOR.WHITE;
        else piece |= COLOR.BLACK;
        switch (c.toLowerCase()) {
            case 'n': piece |= PIECE_TYPE.KNIGHT; break;
            case 'k': piece |= PIECE_TYPE.KING; break;
            case 'r': piece |= PIECE_TYPE.ROOK; break;
            case 'q': piece |= PIECE_TYPE.QUEEN; break;
            case 'b': piece |= PIECE_TYPE.BISHOP; break;
            case 'p': piece |= PIECE_TYPE.PAWN; break;
            default: alert("INVALID PIECE_TYPE", c);
        }
        return piece;
    }
    let start_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
    this.display_FEN = function(fen) {
        let lines = fen.split("/");
        console.assert(lines.length == 8);
        let count = 0;
        for (let line of lines) {
            for (let p of line) {
                if (!isNaN(p.trim())) {
                    count += Number(p);
                    continue;
                }
                let piece_type = parse_char(p);
                let piece = new Piece(piece_type, parseInt(count/8), count%8);
                if (this.pieces[piece.type.toString()] == null) this.pieces[piece.type.toString()] = [];
                this.pieces[piece.type.toString()].push(piece);
                this.grid.children[count].appendChild(piece.display);
                count += 1;
            }
        }
    }
    this.display_FEN(start_FEN);
}

function square_mark(square) { square.classList.add("mouse-in-" + square.color); }
function square_unmark(square) { square.classList.remove("mouse-in-" + square.color); }

function DraggingPiece(x, y, piece) {
    this.start = {x: x, y: y};
    this.piece = piece;
    this.snap_back = function() {
        this.piece.display.style.transform = "none";
    }
    let piece_img = this.piece.display;
    this.snap_vec = {x: this.start.x - piece_img.offsetLeft - piece_img.width/2,
                     y: this.start.y - piece_img.offsetTop - piece_img.height/2};
    this.drag = function(mouse_x, mouse_y) {
        let piece_img = this.piece.display;
        let vec = {x: this.snap_vec.x + mouse_x - this.start.x,
                   y: this.snap_vec.y + mouse_y - this.start.y};
        let cur_square = Chess_board.square_at_coord(mouse_x, mouse_y);
        if (cur_square != piece.square()) square_unmark(piece.square());
        if (Drag_square != cur_square) {
            if (Drag_square != null) square_unmark(Drag_square);
            if (cur_square != null) {
                Drag_square = cur_square;
                square_mark(Drag_square);
            }
        }
        piece_img.style.transform = `translate(${vec.x}px, ${vec.y}px)`
    }
}

function get_slide_moves(directions, color, cell) {
    let square = Chess_board.get_square(cell.row, cell.col);
    let opponent_color = oppose_color(color);
    let moves = []
    for (let direction of directions) {
        let cur_cell = new Cell(direction.row + square.row, direction.col + square.col);
        let cur_square = Chess_board.get_square(cur_cell.row, cur_cell.col);
        while (cur_square != null) {
            if (cur_square.has_piece() && cur_square.piece().color() == color) break;
            let move_type = (cur_square.has_piece() && cur_square.piece().color() == opponent_color) ? MOVE.CAPTURE : MOVE.NORMAL;
            moves.push([cur_square, move_type]);
            if (move_type == MOVE.CAPTURE) break;
            cur_cell = new Cell(direction.row + cur_cell.row, direction.col + cur_cell.col);
            cur_square = Chess_board.get_square(cur_cell.row, cur_cell.col);
        }
    }
    return moves;
}

function get_rook_moves(color, cell) {
    let directions = [new Cell(1, 0), new Cell(-1, 0), new Cell(0, 1), new Cell(0, -1)];
    return get_slide_moves(directions, color, cell);
}

function get_bishop_moves(color, cell) {
    let directions = [new Cell(1, 1), new Cell(-1, -1), new Cell(1, -1), new Cell(-1, 1)];
    return get_slide_moves(directions, color, cell);
}

function get_knight_moves(color, cell) {
    let moves = [];
    let square = Chess_board.get_square(cell.row, cell.col);
    let opponent_color = oppose_color(color);
    let directions = [
        new Cell(-1, 2), new Cell(1, 2), new Cell(-1, -2), new Cell(1, -2),
        new Cell(2, -1), new Cell(2, 1), new Cell(-2, -1), new Cell(-2, 1),
    ]
    for (let direction of directions) {
        let cur_cell = new Cell(direction.row + square.row, direction.col + square.col);
        let cur_square = Chess_board.get_square(cur_cell.row, cur_cell.col);
        if (cur_square == null) continue;
        let move_type = (cur_square.has_piece() && cur_square.piece().color() == opponent_color) ? MOVE.CAPTURE : MOVE.NORMAL;
        if (cur_square.has_piece() && move_type != MOVE.CAPTURE) continue;
        moves.push([cur_square, move_type]);
    }
    return moves;
}

function get_king_moves(color, cell) {
    let moves = [];
    let square = Chess_board.get_square(cell.row, cell.col);
    let opponent_color = oppose_color(color);
    let directions = [
        new Cell(1, 0), new Cell(-1, 0), new Cell(0, 1), new Cell(0, -1),
        new Cell(1, 1), new Cell(-1, -1), new Cell(1, -1), new Cell(-1, 1),
    ]
    for (let direction of directions) {
        let checking_cell = new Cell(direction.row + square.row, direction.col + square.col);
        let cheking_square = Chess_board.get_square(checking_cell.row, checking_cell.col);
        if (cheking_square == null) continue;
        let move_type = (cheking_square.has_piece() && cheking_square.piece().color() == opponent_color) ? MOVE.CAPTURE : MOVE.NORMAL;
        if (cheking_square.has_piece() && move_type != MOVE.CAPTURE) continue;
        moves.push([cheking_square, move_type]);
    }
    // check for castle
    if (!square.piece().has_moved) {
        let left_rook = Chess_board.get(square.row, 0);
        let right_rook = Chess_board.get(square.row, 7);
        if (left_rook && left_rook.piece_type() == PIECE_TYPE.ROOK && !left_rook.has_moved) {
            moves.push([Chess_board.get_square(square.row, 1), MOVE.CASTLE]);
        }
        if (right_rook && right_rook.piece_type() == PIECE_TYPE.ROOK && !right_rook.has_moved) {
            moves.push([Chess_board.get_square(square.row, 6), MOVE.CASTLE]);
        }
    }
    return moves;
}

function get_pawn_moves(color, cell) {
    let moves = [];
    let square = Chess_board.get_square(cell.row, cell.col);
    let forward = color == COLOR.WHITE ? -1 : 1;
    let forward_square = Chess_board.get_square(square.row + forward, square.col);
    let main_diag = Chess_board.get_square(square.row + forward, square.col-1);
    let sub_diag = Chess_board.get_square(square.row + forward, square.col+1);
    if (forward_square && !forward_square.has_piece()) {
        moves.push([forward_square, MOVE.NORMAL]);
        // check for double forward
        let forward_2_square = Chess_board.get_square(square.row + 2*forward, square.col);
        let init_row = color == COLOR.WHITE ? 6 : 1;
        if (square.row == init_row && forward_2_square && !forward_2_square.has_piece()) {
            moves.push([forward_2_square, MOVE.PAWN_DOUBLE_ADVANCE]);
        }
    }
    if (main_diag) {
        if (main_diag.has_piece() && main_diag.piece().color() == oppose_color(color)) {
            moves.push([main_diag, MOVE.CAPTURE]);
        }
        // check for enpassant
        let left_piece = Chess_board.get(square.row, square.col-1);
        if (left_piece && left_piece.has_moved && left_piece.color() == oppose_color(color) &&
            left_piece.last_move().type == MOVE.PAWN_DOUBLE_ADVANCE && left_piece.last_move().turn_count == Current_turn.count-1) {
            moves.push([main_diag, MOVE.ENPASSANT]);
        }
    }
    if (sub_diag) {
        if (sub_diag.has_piece() && sub_diag.piece().color() == oppose_color(color)) {
            moves.push([sub_diag, MOVE.CAPTURE]);
        }
        // check for enpassant
        let right_piece = Chess_board.get(square.row, square.col+1);
        if (right_piece && right_piece.has_moved && right_piece.color() == oppose_color(color) &&
            right_piece.last_move().type == MOVE.PAWN_DOUBLE_ADVANCE && right_piece.last_move().turn_count == Current_turn.count-1) {
            moves.push([sub_diag, MOVE.ENPASSANT]);
        }
    }
    return moves;
}

function get_possible_moves(piece) {
    let result = [];
    switch (piece.piece_type()) {
    case PIECE_TYPE.ROOK  : result = get_rook_moves(piece.color(), piece.cell()); break;
    case PIECE_TYPE.PAWN  : result = get_pawn_moves(piece.color(), piece.cell()); break;
    case PIECE_TYPE.BISHOP: result = get_bishop_moves(piece.color(), piece.cell()); break;
    case PIECE_TYPE.QUEEN :
        let bishop_movees = get_bishop_moves(piece.color(), piece.cell());
        let rook_moves = get_rook_moves(piece.color(), piece.cell());
        result = bishop_movees.concat(rook_moves);
        break;
    case PIECE_TYPE.KNIGHT: result = get_knight_moves(piece.color(), piece.cell()); break;
    case PIECE_TYPE.KING  : result = get_king_moves(piece.color(), piece.cell()); break;
    default:
    }
    return result.map((x) => new Move(piece, x[0], x[1]));
}

function is_square_in_attack(color, cell) {
    let straight_moves = get_rook_moves(color, cell);
    let diag_moves = get_bishop_moves(color, cell);
    let knight_moves = get_knight_moves(color, cell);
    for (let [square, type] of straight_moves) {
        if (type != MOVE.CAPTURE) continue;
        let attacker = Chess_board.get(square.row, square.col).piece_type();
        if (attacker == PIECE_TYPE.ROOK || attacker == PIECE_TYPE.QUEEN) return true;
    }
    for (let [square, type] of diag_moves) {
        if (type != MOVE.CAPTURE) continue;
        let attacker = Chess_board.get(square.row, square.col).piece_type();
        if (attacker == PIECE_TYPE.BISHOP || attacker == PIECE_TYPE.QUEEN) return true;
        else if (attacker == PIECE_TYPE.PAWN) {
            let forward = color == COLOR.WHITE ? -1 : 1;
            if (cell.row + forward == square.row) return true;
        }
    }
    for (let [square, type] of knight_moves) {
        if (type != MOVE.CAPTURE) continue;
        let attacker = Chess_board.get(square.row, square.col).piece_type();
        if (attacker == PIECE_TYPE.KNIGHT) return true;
    }
    return false;
}

function is_legal_move(move) { // make move then check if king is in check then undo
    // check by assume that each square in between has a king
    // then we check if any of these king is in checked
    if (move.type == MOVE.CASTLE) {
        if (is_square_in_attack(move.mover.color(), move.mover.cell())) return false;
        let dir = move.target.col == 0 ? -1 : 1;
        for (let i = move.mover.col + dir; i != move.target.col; i += dir) {
            if (Chess_board.get(move.mover.row, i) != null) return false;
            if (is_square_in_attack(move.mover.color(), new Cell(move.mover.row, i))) return false;
        }
        return true;
    }
    let result = true;
    move.mover.row = move.to.row;
    move.mover.col = move.to.col;
    if (move.type == MOVE.CAPTURE || move.type == MOVE.ENPASSANT) Chess_board.remove(move.target); // add back later
    let temp = move.mover.has_moved;
    move.mover.has_moved = true;
    move.from.removeChild(move.mover.display);
    move.to.appendChild(move.mover.display);
    move.mover.moves.push(move);
    let my_king = Chess_board.find(move.mover.color() | PIECE_TYPE.KING)[0];
    if (is_square_in_attack(my_king.color(), my_king.cell())) result =  false;
    // undo
    move.mover.moves.pop();
    move.to.removeChild(move.mover.display);
    move.from.appendChild(move.mover.display);
    move.mover.has_moved = temp;
    if (move.type == MOVE.CAPTURE || move.type == MOVE.ENPASSANT) {
        let target = Chess_board.removed_pieces.pop();
        target.square().appendChild(target.display);
        Chess_board.add(target);
    }
    move.mover.row = move.from.row;
    move.mover.col = move.from.col;
    return result;
}

function MovingPiece(piece) {
    this.piece = piece;
    this.moves = get_possible_moves(piece).filter(is_legal_move);
    this.piece.square().classList.toggle("selected");
    for (let move of this.moves) {
        let square = Chess_board.get_square(move.to.row, move.to.col)
        if (move.type == MOVE.CAPTURE) square.classList.toggle("on-attacked");
        else square.classList.toggle("posible-move");
    }
    this.unmark = function() {
        this.piece.square().classList.toggle("selected");
        for (let move of this.moves) {
            let square = Chess_board.get_square(move.to.row, move.to.col)
            if (move.type == MOVE.CAPTURE) square.classList.toggle("on-attacked");
            else square.classList.toggle("posible-move");
        }
    }
    this.can_move= function(square) {
        for (let move of this.moves) {
            if (square.row == move.to.row && square.col == move.to.col) return move;
        }
        return null;
    }
    this.make_move = function(move) {
        this.piece.move(move);
        change_turn();
    }
}

function square_mouse_down(e) {
    if (e.button != 0) return; // only handle left mouse button (main button)
    square_unmark(this);
    if (Moving_piece != null && Moving_piece.piece.square() != this) {
        Moving_piece.unmark();
        let possible_move = Moving_piece.can_move(this);
        if (possible_move != null) {
            Moving_piece.make_move(possible_move);
        }
        Moving_piece = null;
    }
}
function piece_mouse_up(e) { // for drag piece up
    if (e.button != 0) return; // only handle left mouse button (main button)
    if (Dragging_piece != null) {
        if (Moving_piece != null) {
            let square = Chess_board.square_at_coord(e.clientX, e.clientY);
            if (square != null) {
                let possible_move = Moving_piece.can_move(square);
                if (possible_move != null) {
                    Moving_piece.unmark();
                    Moving_piece.make_move(possible_move);
                    square_unmark(possible_move.to);
                    Moving_piece = null;
                } else Dragging_piece.snap_back();
            } else Dragging_piece.snap_back();
        }
    }
    Dragging_piece = null;
}
function piece_drag_start(e) {
    if (Dragging_piece == null && Current_turn.color == this.piece.color()) {
        Dragging_piece = new DraggingPiece(e.clientX, e.clientY, this.piece);
    }
    e.preventDefault();
}
function piece_mouse_down(e) {
    if (e.button != 0) return; // only handle left mouse button (main button)
    if (Moving_piece != null) {
        Moving_piece.unmark();
        let done = false;
        if (Moving_piece.piece != this.piece) {
            let possible_move = Moving_piece.can_move(this.piece.square());
            if (possible_move != null) {
                Moving_piece.make_move(possible_move);
                done = true;
            }
        } else done = true;
        Moving_piece = null;
        if (done) return;
    }
    if (Current_turn.color == this.piece.color()) Moving_piece = new MovingPiece(this.piece);
}
window.onmousemove = function(e) {
    if (Dragging_piece != null) {
        if (Moving_piece == null) Moving_piece = new MovingPiece(Dragging_piece.piece);
        Dragging_piece.drag(e.clientX, e.clientY);
    }
}
window.onmouseup = function(e) {
    if (Dragging_piece != null) {
        Dragging_piece = null;
    }
}

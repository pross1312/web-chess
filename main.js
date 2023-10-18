// TODO: timer, clock
const COLOR = {
    BLACK: 0,
    WHITE: 1,
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
let Current_turn     = {count: 0, color: COLOR.BLACK};
let Dragging_piece   = null;
let Moving_piece     = null;
// ----------------------------------------------
// support utils
function change_turn()       {
    Current_turn = {
        count: Current_turn.count + 1,
        color: 1 - Current_turn.color,
    };
    if (Current_turn.color == COLOR.BLACK) {
        document.getElementById("turn-text").innerText = "Black to move"
    } else {
        document.getElementById("turn-text").innerText = "White to move"
    }
}
function oppose_color(color) { return 1 - color; }
function Vec(x, y) {
    this.x = x;
    this.y = y;
    this.add = (v) => Vec(this.x + v.x, this.y + v.y);
}
function Cell(r, c) { this.row = r; this.col = c; }
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
    this.display.draggable = false;
    this.square = function() { return Chess_board.get_square(this.row, this.col); }
    this.display.piece = this;
    this.display.onmousedown = function(e){ piece_mouse_down(e, this.piece); };
    this.display.onmouseup = function(e){ piece_mouse_up(e, this.piece); };
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
        let oppose_king = Chess_board.find(oppose_color(this.color()) | PIECE_TYPE.KING);
        if (is_square_in_attack(oppose_king.color(), oppose_king.cell())) oppose_king.square().classList.add("in-check");
        else oppose_king.square().classList.remove("in-check");
        if (this.piece_type() == PIECE_TYPE.KING) {
            move.from.classList.remove("in-check");
        } else {
            let my_king = Chess_board.find(this.color() | PIECE_TYPE.KING);
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
        let forward = this.mover.color() == COLOR.BLACK ? -1 : 1;
        this.target = Chess_board.get(this.to.row - forward, this.to.col);
        console.assert(this.target != null && this.target.color() == oppose_color(this.mover.color()));
    } else if (type == MOVE.CASTLE) {
        if (this.to.col == 1) this.target = Chess_board.get(this.mover.row, 0);
        else if (this.to.col == 6) this.target = Chess_board.get(this.mover.row, 7);
        else alert("Unknown castle pos", this.to.col);
    }
}


function Board() {
    this.cell_size = 90;
    this.grid = document.getElementById("chess-board");
    this.grid.style.width = 8 * this.cell_size;
    this.grid.style.height = 8 * this.cell_size;
    this.grid.style.gridTemplateColumns = `repeat(8, ${this.cell_size}px)`;
    this.grid.style.gridTemplateRows = `repeat(8, ${this.cell_size}px)`;
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
    this.remove = function(piece) {
        this.removed_pieces.push(piece);
        piece.square().removeChild(piece.display);
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
            square.coord = Vec(c*this.cell_size, r*this.cell_size);
            square.onmousedown = square_mouse_down;
            if ((r+c) % 2 == 0) square.classList.toggle("black");
            else square.classList.toggle("white");
        }
    }
    function parse_char(c) {
        let piece = PIECE_TYPE.NONE;
        if (c.toUpperCase() == c) piece |= COLOR.BLACK;
        else piece |= COLOR.WHITE;
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
                this.pieces[piece.type.toString()] = piece;
                this.grid.children[count].appendChild(piece.display);
                count += 1;
            }
        }
    }
    this.display_FEN(start_FEN);
}

function DraggingPiece(x, y, piece) {
    this.start = new Vec(x, y);
    this.piece = piece;
    this.snap_triggered = false;
    this.snap_vec = new Vec(0, 0);
    this.snap_back = function() {
        this.piece.display.style.transform = "none";
    }
    this.drag = function(mouse_x, mouse_y) {
        let piece_img = this.piece.display;
        if (!this.snap_triggered) {
            this.snap_vec = new Vec(mouse_x - piece_img.offsetLeft - piece_img.width/2,
                                    mouse_y - piece_img.offsetTop - piece_img.height/2);
            this.snap_triggered = true;
        }
        let vec = new Vec(this.snap_vec.x + mouse_x - this.start.x,
                          this.snap_vec.y + mouse_y - this.start.y);
        piece_img.style.transform = `translate(${vec.x}px, ${vec.y}px)`
    }
}

function get_slide_moves(directions, color, cell) {
    let square = Chess_board.get_square(cell.row, cell.col);
    if (square == null) console.log(cell.row, cell.col);
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
    console.log(square);
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
    let forward = color == COLOR.BLACK ? -1 : 1;
    let forward_square = Chess_board.get_square(square.row + forward, square.col);
    let main_diag = Chess_board.get_square(square.row + forward, square.col-1);
    let sub_diag = Chess_board.get_square(square.row + forward, square.col+1);
    if (forward_square && !forward_square.has_piece()) {
        moves.push([forward_square, MOVE.NORMAL]);
        // check for double forward
        let forward_2_square = Chess_board.get_square(square.row + 2*forward, square.col);
        let init_row = color == COLOR.BLACK ? 6 : 1;
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
    for (let [cell, type] of straight_moves) {
        if (type != MOVE.CAPTURE) continue;
        let attacker = Chess_board.get(cell.row, cell.col).piece_type();
        if (attacker == PIECE_TYPE.ROOK || attacker == PIECE_TYPE.QUEEN) return true;
    }
    for (let [cell, type] of diag_moves) {
        if (type != MOVE.CAPTURE) continue;
        let attacker = Chess_board.get(cell.row, cell.col).piece_type();
        if (attacker == PIECE_TYPE.BISHOP || attacker == PIECE_TYPE.QUEEN) return true;
        else if (attacker == PIECE_TYPE.PAWN && Math.abs(move.target.row - king.row) == 1) return true;
    }
    for (let [cell, type] of knight_moves) {
        if (type != MOVE.CAPTURE) continue;
        let attacker = Chess_board.get(cell.row, cell.col).piece_type();
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
    let my_king = Chess_board.find(move.mover.color() | PIECE_TYPE.KING);
    if (is_square_in_attack(my_king.color(), my_king.cell())) result =  false;
    // undo
    move.mover.moves.pop();
    move.to.removeChild(move.mover.display);
    move.from.appendChild(move.mover.display);
    move.mover.has_moved = temp;
    if (move.type == MOVE.CAPTURE || move.type == MOVE.ENPASSANT) {
        let target = Chess_board.removed_pieces.pop();
        target.square().appendChild(target.display);
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
        Chess_board.get_square(move.to.row, move.to.col).classList.toggle("posible-move");
    }
    this.unmark = function() {
        this.piece.square().classList.toggle("selected");
        for (let move of this.moves) {
            Chess_board.get_square(move.to.row, move.to.col).classList.toggle("posible-move");
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

function piece_mouse_up(e) {
    e.stopPropagation();
    if (Dragging_piece != null) {
        if (Moving_piece != null) {
            let square = Chess_board.square_at_coord(e.clientX, e.clientY);
            if (square != null) {
                let possible_move = Moving_piece.can_move(square);
                if (possible_move != null) {
                    Moving_piece.unmark();
                    Moving_piece.make_move(possible_move);
                    Moving_piece = null;
                } else Dragging_piece.snap_back();
            } else Dragging_piece.snap_back();
        }
        Dragging_piece = null;
    }
}
function square_mouse_down(e) {
    if (Moving_piece != null && Moving_piece.piece.square() != this) {
        Moving_piece.unmark();
        let possible_move = Moving_piece.can_move(this);
        if (possible_move != null) {
            Moving_piece.make_move(possible_move);
        }
        Moving_piece = null;
    }
}
function piece_mouse_down(e, piece) {
    e.stopPropagation();
    if (Moving_piece != null) {
        if (Moving_piece.piece != piece) {
            let possible_move = Moving_piece.can_move(piece.square());
            if (possible_move != null) {
                Moving_piece.unmark();
                Moving_piece.make_move(possible_move);
                Moving_piece = null;
                return;
            }
        }
        Moving_piece.unmark();
        if (Moving_piece.piece == piece) {
            Moving_piece = null;
            return;
        }
        Moving_piece = null;
    }
    if (Current_turn.color == piece.color()) Moving_piece = new MovingPiece(piece);
    if (Dragging_piece == null && Current_turn.color == piece.color()) {
        Dragging_piece = new DraggingPiece(e.clientX, e.clientY, piece);
    }
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

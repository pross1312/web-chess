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
    this.square = function() { return this.display.parentNode; }
    this.display.piece = this;
    this.display.onmousedown = function(e){ piece_mouse_down(e, this.piece); };
    this.display.onmouseup = function(e){ piece_mouse_up(e, this.piece); };
    this.move = function(move) {
        this.row = move.to.row;
        this.col = move.to.col;
        this.display.style.transform = "none";
        move.from.removeChild(this.display);
        if (move.type == MOVE.CAPTURE || move.type == MOVE.ENPASSANT) {
            move.target.square().innerHTML = "";
            move.target = null;
        } else if (move.type == MOVE.CASTLE) {
            let rook_new_col = move.to.col == 6 ? 5 : 2;
            move.target.move(new Move(move.target, Chess_board.get_square(move.to.row, rook_new_col), MOVE.NORMAL));
        }
        this.has_moved = true;
        move.to.appendChild(this.display);
        this.moves.push(move);
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
        let forward = piece.color() == COLOR.BLACK ? -1 : 1;
        this.target = Chess_board.get(this.to.row - forward, this.to.col);
        console.assert(this.target != null && this.target.color() == oppose_color(this.mover.color()));
    } else if (type == MOVE.CASTLE) {
        if (this.to.col == 1) this.target = Chess_board.get(piece.row, 0);
        else if (this.to.col == 6) this.target = Chess_board.get(piece.row, 7);
        else alert("Unknown castle pos", this.to.col);
    }
}


function Board() {
    this.cell_size = 80;
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
    this.get = function(r, c) { return this.get_square(r, c).piece(); }
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

function get_slide_moves(directions, piece) {
    let opponent_color = oppose_color(piece.color());
    let moves = []
    for (let direction of directions) {
        let cur_cell = new Cell(direction.row + piece.row, direction.col + piece.col);
        let cur_square = Chess_board.get_square(cur_cell.row, cur_cell.col);
        while (cur_square != null) {
            if (cur_square.has_piece() && cur_square.piece().color() == piece.color()) break;
            let move_type = (cur_square.has_piece() && cur_square.piece().color() == opponent_color) ? MOVE.CAPTURE : MOVE.NORMAL;
            moves.push(new Move(piece, cur_square, move_type));
            if (move_type == MOVE.CAPTURE) break;
            cur_cell = new Cell(direction.row + cur_cell.row, direction.col + cur_cell.col);
            cur_square = Chess_board.get_square(cur_cell.row, cur_cell.col);
        }
    }
    return moves;
}

function get_rook_moves(piece) {
    let moves = [];
    let directions = [new Cell(1, 0), new Cell(-1, 0), new Cell(0, 1), new Cell(0, -1)];
    return get_slide_moves(directions, piece);
}

function get_bishop_moves(piece) {
    let moves = [];
    let directions = [new Cell(1, 1), new Cell(-1, -1), new Cell(1, -1), new Cell(-1, 1)];
    return get_slide_moves(directions, piece);
}

function get_knight_moves(piece) {
    let moves = [];
    let opponent_color = oppose_color(piece.color());
    let directions = [
        new Cell(-1, 2), new Cell(1, 2), new Cell(-1, -2), new Cell(1, -2),
        new Cell(2, -1), new Cell(2, 1), new Cell(-2, -1), new Cell(-2, 1),
    ]
    for (let direction of directions) {
        let cur_cell = new Cell(direction.row + piece.row, direction.col + piece.col);
        let cur_square = Chess_board.get_square(cur_cell.row, cur_cell.col);
        if (cur_square == null) continue;
        let move_type = (cur_square.has_piece() && cur_square.piece().color() == opponent_color) ? MOVE.CAPTURE : MOVE.NORMAL;
        if (cur_square.has_piece() && move_type != MOVE.CAPTURE) continue;
        moves.push(new Move(piece, cur_square, move_type));
    }
    return moves;
}

function get_king_moves(piece) {
    let moves = [];
    let opponent_color = oppose_color(piece.color());
    let directions = [
        new Cell(1, 0), new Cell(-1, 0), new Cell(0, 1), new Cell(0, -1),
        new Cell(1, 1), new Cell(-1, -1), new Cell(1, -1), new Cell(-1, 1),
    ]
    for (let direction of directions) {
        let cur_cell = new Cell(direction.row + piece.row, direction.col + piece.col);
        let cur_square = Chess_board.get_square(cur_cell.row, cur_cell.col);
        if (cur_square == null) continue;
        let move_type = (cur_square.has_piece() && cur_square.piece().color() == opponent_color) ? MOVE.CAPTURE : MOVE.NORMAL;
        if (cur_square.has_piece() && move_type != MOVE.CAPTURE) continue;
        moves.push(new Move(piece, cur_square, move_type));
    }
    if (!piece.has_moved) {
        function check_block(row, start_col, end_col) {
            for (let i = start_col; i <= end_col; i++) if (Chess_board.get(row, i) != null) return true;
            return false;
        }
        let left_rook = Chess_board.get(piece.row, 0);
        let right_rook = Chess_board.get(piece.row, 7);
        if (!check_block(piece.row, 1, piece.col-1) && left_rook &&
            left_rook.piece_type() == PIECE_TYPE.ROOK && !left_rook.has_moved) {
            moves.push(new Move(piece, Chess_board.get_square(piece.row, 1), move.castle));
        }
        if (!check_block(piece.row, piece.col+1, 6) && right_rook &&
            right_rook.piece_type() == PIECE_TYPE.ROOK && !right_rook.has_moved) {
            moves.push(new Move(piece, Chess_board.get_square(piece.row, 6), MOVE.CASTLE));
        }
    }
    return moves;
}

function get_pawn_moves(piece) {
    let moves = [];
    let forward = piece.color() == COLOR.BLACK ? -1 : 1;
    let forward_square = Chess_board.get_square(piece.row + forward, piece.col);
    let main_diag = Chess_board.get_square(piece.row + forward, piece.col-1);
    let sub_diag = Chess_board.get_square(piece.row + forward, piece.col+1);
    if (forward_square && !forward_square.has_piece()) {
        moves.push(new Move(piece, forward_square, MOVE.NORMAL));
        let forward_2_square = Chess_board.get_square(piece.row + 2*forward, piece.col);
        if (!piece.has_moved && forward_2_square && !forward_2_square.has_piece()) {
            moves.push(new Move(piece, forward_2_square, MOVE.PAWN_DOUBLE_ADVANCE));
        }
    }
    if (main_diag) {
        if (main_diag.has_piece() && main_diag.piece().color() == oppose_color(piece.color())) {
            moves.push(new Move(piece, main_diag, MOVE.CAPTURE));
        }
        let left_piece = Chess_board.get(piece.row, piece.col-1);
        if (left_piece && left_piece.has_moved && left_piece.color() == oppose_color(piece.color()) &&
            left_piece.last_move().type == MOVE.PAWN_DOUBLE_ADVANCE && left_piece.last_move().turn_count == Current_turn.count-1) {
            moves.push(new Move(piece, main_diag, MOVE.ENPASSANT));
        }
    }
    if (sub_diag) {
        if (sub_diag.has_piece() && sub_diag.piece().color() == oppose_color(piece.color())) {
            moves.push(new Move(piece, sub_diag, MOVE.CAPTURE));
        }
        let right_piece = Chess_board.get(piece.row, piece.col+1);
        if (right_piece && right_piece.has_moved && right_piece.color() == oppose_color(piece.color()) &&
            right_piece.last_move().type == MOVE.PAWN_DOUBLE_ADVANCE && right_piece.last_move().turn_count == Current_turn.count-1) {
            moves.push(new Move(piece, sub_diag, MOVE.ENPASSANT));
        }
    }
    return moves;
}

function get_possible_moves(piece) {
    switch (piece.piece_type()) {
    case PIECE_TYPE.ROOK  : return get_rook_moves(piece);
    case PIECE_TYPE.PAWN  : return get_pawn_moves(piece);
    case PIECE_TYPE.BISHOP: return get_bishop_moves(piece);
    case PIECE_TYPE.QUEEN : return get_bishop_moves(piece).concat(get_rook_moves(piece));
    case PIECE_TYPE.KNIGHT: return get_knight_moves(piece);
    case PIECE_TYPE.KING  : return get_king_moves(piece);
    default:
    }
    return [];
}

function MovingPiece(piece) {
    this.piece = piece;
    this.moves = get_possible_moves(piece);
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

let chess_board = null;
const COLOR = {
    BLACK: 0,
    WHITE: 1,
};
const PIECE = {
    PAWN: 0b10,
    BISHOP: 0b100,
    KNIGHT: 0b110,
    ROOK: 0b1000,
    QUEEN: 0b1010,
    KING: 0b1100,
    NONE: 0,
};
function Cell(r, c) { return {row: r, col: c}; }
function DragItem(x, y, item) {
    this.start = {x: x, y: y};
    this.item = item;
    this.snap_trigger = false;
    this.snap_back = function() {
        this.item.getElementsByTagName("img")[0].style.transform = "none";
    }
    this.get_snap_to_center_vec = function(img, pos) {
        this.snap_vec = {x: pos.x - img.offsetLeft - img.width/2, y: pos.y - img.offsetTop - img.height/2};
        this.snap_trigger = true;
    }
    this.drag = function(mouse_pos) {
        let item_img = this.item.getElementsByTagName("img")[0];
        if (!this.snap_trigger) this.get_snap_to_center_vec(item_img, mouse_pos);
        let vec = {
            x:  this.snap_vec.x + mouse_pos.x - this.start.x,
            y:  this.snap_vec.y + mouse_pos.y - this.start.y
        };
        item_img.style.transform = `translate(${vec.x}px, ${vec.y}px)`
    }
}
let drag_item = null;

function get_color(piece) { if (piece == null || piece == PIECE.NONE) return null; return piece & 1; }
function get_type(piece) { return piece & (~1); }

function get_rook_moves(color, cell) {
    let opponent_color = 1 - color;
    let moves = [];
    let directions = [Cell(1, 0), Cell(-1, 0), Cell(0, 1), Cell(0, -1)];
    for (let direction of directions) {
        let cur_cell = Cell(direction.row + cell.row, direction.col + cell.col);
        let cur_piece = chess_board.get(cur_cell.row, cur_cell.col);
        while (cur_piece != null) {
            if (get_color(cur_piece) == color) break;
            moves.push(cur_cell);
            if (get_color(cur_piece) == opponent_color) break;
            cur_cell = Cell(direction.row + cur_cell.row, direction.col + cur_cell.col);
            cur_piece = chess_board.get(cur_cell.row, cur_cell.col);
        }
    }
    return moves;
}

function get_pawn_moves(color, cell) {
    let forward = (color == COLOR.BLACK ? -1 : 1);
    let result = [];
    for (let i = -1; i <= 1; i++) {
        let check_piece = chess_board.get(cell.row + forward, cell.col + i);
        if (check_piece == null) continue;
        if (i == 0) { if (check_piece == PIECE.NONE) result.push(Cell(cell.row + forward, cell.col)); }
        else if (get_color(check_piece) == (1-color)) result.push(Cell(cell.row + forward, cell.col + i));
    }
    return result;
}

function get_bishop_moves(color, cell) {
    let opponent_color = 1 - color;
    let moves = [];
    let directions = [Cell(1, 1), Cell(-1, -1), Cell(1, -1), Cell(-1, 1)];
    for (let direction of directions) {
        let cur_cell = Cell(direction.row + cell.row, direction.col + cell.col);
        let cur_piece = chess_board.get(cur_cell.row, cur_cell.col);
        while (cur_piece != null) {
            if (get_color(cur_piece) == color) break;
            moves.push(cur_cell);
            if (get_color(cur_piece) == opponent_color) break;
            cur_cell = Cell(direction.row + cur_cell.row, direction.col + cur_cell.col);
            cur_piece = chess_board.get(cur_cell.row, cur_cell.col);
        }
    }
    return moves;
}

function get_knight_moves(color, cell) {
    let moves = [];
    let directions = [Cell(2, 1), Cell(2, -1), Cell(1, 2), Cell(-1, 2),
                      Cell(-2, 1), Cell(-2, -1), Cell(1, -2), Cell(-1, -2)];
    for (let direction of directions) {
        let cur_cell = Cell(direction.row + cell.row, direction.col + cell.col);
        let cur_piece = chess_board.get(cur_cell.row, cur_cell.col);
        if (cur_piece == null || get_color(cur_piece) == color) continue;
        moves.push(cur_cell);
    }
    return moves;

}

function get_possible_moves(piece, cell) {
    switch (get_type(piece)) {
    case PIECE.ROOK: return get_rook_moves(get_color(piece), cell); break;
    case PIECE.PAWN: return get_pawn_moves(get_color(piece), cell); break;
    case PIECE.BISHOP: return get_bishop_moves(get_color(piece), cell); break;
    case PIECE.QUEEN: return get_bishop_moves(get_color(piece), cell).concat(get_rook_moves(get_color(piece), cell)); break;
    case PIECE.KNIGHT: return get_knight_moves(get_color(piece), cell)
    default:
    }
    return [];
}

let moving_item = null;
function MovingItem(item) {
    this.item = item;
    this.moves = get_possible_moves(item.piece, Cell(item.row, item.col));
    console.log(this.moves);
    this.item.classList.toggle("selected");
    for (let move of this.moves) {
        console.log(move);
        chess_board.grid.children[move.row * 8 + move.col].classList.toggle("posible-move");
    }
    this.unmark = function() {
        this.item.classList.toggle("selected");
        for (let move of this.moves) {
            // let child = chess_board.grid.children[move.row * 8 + move.col];
            // child.style.backgroundColor = child.original_backround;
            chess_board.grid.children[move.row * 8 + move.col].classList.toggle("posible-move");
        }
    }
    this.can_move= function(cell) {
        for (let move of this.moves) {
            if (cell.row == move.row && cell.col == move.col) return true;
        }
        return false;
    }
}

function move_item(from_item, to_item) {
    let from_img = from_item.getElementsByTagName("img")[0];
    from_item.removeChild(from_img);
    // reset img
    from_img.style.transform = "none";
    from_img.snap_vec = null;
    from_img.snap_trigger = false;
    to_item.piece = from_item.piece;
    from_item.piece = PIECE.NONE;
    to_item.innerHTML = "";
    to_item.appendChild(from_img);
}

function Board() {
    this.cell_size = 70;
    this.grid = document.getElementById("chess-board");
    this.grid.style.width = 8 * this.cell_size;
    this.grid.style.height = 8 * this.cell_size;
    this.grid.style.gridTemplateColumns = `repeat(8, ${this.cell_size}px)`;
    this.grid.style.gridTemplateRows = `repeat(8, ${this.cell_size}px)`;
    this.get = function(r, c) {
        if (r >= 8 || r < 0 || c >= 8 || c < 0) return null;
        return this.grid.children[r * 8 + c].piece;
    };
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            let square = document.createElement("div");
            square.classList.toggle("square");
            this.grid.appendChild(square);
            square.original_backround = square.style.backgroundColor;
            square.row = r;
            square.col = c;
            square.board = this;
            square.pos = {x: c*this.cell_size, y: r*this.cell_size};
            square.piece = PIECE.NONE;
            square.onmouseup = function (e) { // only if there is a drag item
                if (drag_item != null) {
                    if (moving_item != null) {
                        if (moving_item.can_move(Cell(this.row, this.col))) {
                            move_item(moving_item.item, this);
                            moving_item.unmark();
                            moving_item = null;
                        } else {
                            drag_item.snap_back();
                        }
                        drag_item = null;
                    }
                }
            }
            square.onmousedown = function(e) { // trigger moving item and drag item, handle moving item click (move with click not drag)
                if (moving_item != null) {
                    if (moving_item.can_move(Cell(this.row, this.col))) {
                        move_item(moving_item.item, this);
                    }
                    moving_item.unmark();
                    if (moving_item.item != this) moving_item = null;
                    else moving_item = new MovingItem(this);
                } else if (this.piece != PIECE.NONE) {
                    moving_item = new MovingItem(this);
                }
                if (this.piece != PIECE.NONE) drag_item = new DragItem(e.clientX, e.clientY, this);
            }
            if ((r+c) % 2 == 0) square.classList.toggle("black");
            else square.classList.toggle("white");
        }
    }
    function parse_char(c) {
        let piece = PIECE.NONE;
        let name = "";
        if (c.toUpperCase() == c) {
            piece |= COLOR.BLACK;
            name = "b";
        } else {
            piece |= COLOR.WHITE;
            name = "w";
        }
        switch (c.toLowerCase()) {
            case 'n': piece |= PIECE.KNIGHT; break;
            case 'k': piece |= PIECE.KING; break;
            case 'r': piece |= PIECE.ROOK; break;
            case 'q': piece |= PIECE.QUEEN; break;
            case 'b': piece |= PIECE.BISHOP; break;
            case 'p': piece |= PIECE.PAWN; break;
            default: alert("INVALID PIECE", c);
        }
        return [piece, name + c.toLowerCase()];
    }
    // let start_FEN = "rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R";
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
                let [piece, name] = parse_char(p);
                let img = document.createElement("img");
                img.src = "./images/" + name + ".png";
                img.draggable = false;
                img.onmousemove = null;
                this.grid.children[count].piece = piece;
                this.grid.children[count].appendChild(img);
                this.grid.children[count].name = name;
                count += 1;
            }
        }
    }
    this.display_FEN(start_FEN);
}
chess_board = new Board();

window.onmousemove = function(e) {
    if (drag_item != null) {
        if (moving_item == null) moving_item = new MovingItem(drag_item.item); // for some case like when we first click to select then later drag it 
        drag_item.drag({x: e.clientX, y: e.clientY});
    }
}
window.onmouseup = function(e) { // for cases like when mouse up outside of board
    if (drag_item) {
        drag_item.snap_back();
        drag_item = null;
    }
}
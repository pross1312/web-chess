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
function DragItem(x, y, item) {
    this.start = {x: x, y: y};
    this.item = item;
}
let drag_item = null;
function snap_center_img_to_pos(img, pos) {
    console.log(img.offsetLeft);
    img.snap_vec = {x: pos.x - img.offsetLeft - img.width/2, y: pos.y - img.offsetTop - img.height/2};
    img.snap_trigger = true;
}
window.onmousemove = function(e) {
    if (drag_item != null) {
        let item_img = drag_item.item.getElementsByTagName("img")[0];
        if (item_img.snap_trigger != true) snap_center_img_to_pos(item_img, {x: e.clientX, y: e.clientY});
        let vec = {x:  item_img.snap_vec.x + e.clientX - drag_item.start.x, y:  item_img.snap_vec.y + e.clientY - drag_item.start.y };
        item_img.style.transform = `translate(${vec.x}px, ${vec.y}px)`
    }
}
function Board() {
    this.cell_size = 70;
    this.display = document.getElementById("chess-board");
    this.display.style.width = 8 * this.cell_size;
    this.display.style.height = 8 * this.cell_size;
    this.display.style.gridTemplateColumns = `repeat(8, ${this.cell_size}px)`;
    this.display.style.gridTemplateRows = `repeat(8, ${this.cell_size}px)`;
    this.grid = new Uint8Array(8*8);
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            let square = document.createElement("div");
            square.row = r;
            square.col = c;
            square.pos = {x: c*this.cell_size, y: r*this.cell_size};
            square.piece = PIECE.NONE;
            square.classList.toggle("square");
            square.onmouseup = function (e) {
                if (drag_item != null) {
                    let item = drag_item.item;
                    let img = item.getElementsByTagName("img")[0];
                    item.removeChild(img);
                    img.style.transform = "none";
                    img.snap_vec = null;
                    img.snap_trigger = false;
                    this.piece = item.piece;
                    this.innerHTML = "";
                    this.appendChild(img);
                    drag_item = null;
                }
            }
            square.onmousedown = function(e) {
                if (this.piece !== PIECE.NONE) {
                    drag_item = new DragItem(e.clientX, e.clientY, this);
                }
            }
            if ((r+c) % 2 == 0) square.classList.toggle("black");
            else square.classList.toggle("white");
            this.display.appendChild(square);
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
                this.grid[count] = piece;
                let img = document.createElement("img");
                img.src = "./images/" + name + ".png";
                img.draggable = false;
                img.onmousemove = null;
                this.display.children[count].piece = piece;
                this.display.children[count].appendChild(img);
                this.display.children[count].name = name;
                count += 1;
            }
        }
    }
    this.display_FEN(start_FEN);
}


chess_board = new Board();
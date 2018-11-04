// add colors to vertex shaders

class ColorConsts {
    static addColor(color, colors) {
        switch (color) {
            case "green":
                colors.push(0.011, 0.709, 0.043, 1.0);
                return colors;
            case "red":
                colors.push(0.984, 0.070, 0.015, 1.0);
                return colors;
            case "yellow":
                colors.push(0.984, 0.952, 0.015, 1.0);
                return colors;
            case "blue":
                colors.push(0.015, 0.329, 0.984, 1.0);
                return colors;
            case "brown":
                colors.push(0.525, 0.254, 0.015, 1.0);
                return colors;
            case "grey":
                colors.push(0.619, 0.607, 0.603, 1.0);
                return colors;
            case "orange":
                colors.push(0.905, 0.431, 0.015, 1.0);
                return colors;
            case "purple":
                colors.push(0.568, 0.015, 0.905, 1.0);
                return colors;
            case "white":
                colors.push(1.0, 1.0, 1.0, 1.0);
                return colors;
            case "black":
                colors.push(0.0, 0.0, 0.0, 1.0);
                return colors;
            default:
                alert("Color '" + color + "' does not appear to exist in the app!");
                return null;
        }
    }
}
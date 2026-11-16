declare module 'omml2mathml' {
    // Takes an OMML DOM Node/Element (e.g. m:oMath or m:oMathPara) and returns a MathML DOM element
    function omml2mathml(node: Node | Element): Element | null;
    export = omml2mathml;
}

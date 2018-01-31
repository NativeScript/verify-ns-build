const SUCCESS_COLOR = "green";
const ERROR_COLOR = "red";

const configurations = {};
const breadcrumbsDimensions = { w: 150, h: 40, s: 7, t: 20 };

const width = 960;
const height = 700;
const radius = (Math.min(width, height) / 2) - 10;

const x = d3.scale.linear().range([0, 2 * Math.PI]);
const y = d3.scale.sqrt().range([0, radius]);

const partition = d3.layout.partition().value(node => node.size);

const arc = d3.svg.arc()
    .startAngle(node => Math.max(0, Math.min(2 * Math.PI, x(node.x))))
    .endAngle(node => Math.max(0, Math.min(2 * Math.PI, x(node.x + node.dx))))
    .innerRadius(node => Math.max(0, y(node.y)))
    .outerRadius(node => Math.max(0, y(node.y + node.dy)));

const svg = d3.select("#sunburst").append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("id", "container")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

visualizeData(json);

function visualizeData(root) {
    root = formatData(root);

    const path = svg.selectAll("path") 
        .data(partition.nodes(root))
        .enter().append("path") 
            .on("click", click) 
            .on("mouseover", mouseover) 
            .attr("d", arc) 
            .style("fill", colors)
            .style("opacity", 1)
        .append("title")
            .text(node => node.name);

    d3.select("#container").on("mouseleave", mouseleave);
    initializeBreadcrumbTrail();
}

function click(node) {
    svg.transition()
        .duration(750)
        .tween("scale", function() {
            const xd = d3.interpolate(x.domain(), [node.x, node.x + node.dx]);
            const yd = d3.interpolate(y.domain(), [node.y, 1]);
            const yr = d3.interpolate(y.range(), [node.y ? 20 : 0, radius]);

            return t => { x.domain(xd(t)); y.domain(yd(t)).range(yr(t)); };
        })
        .selectAll("path")
        .attrTween("d", function(node) { return function() { return arc(node); }; });
}

function updateText(node) {
    const container = document.getElementById("meta");
    updateTitle(container, node.name, "h1");

    const { meta } = node;
    const configuration = configurations[node.name];
    const info = Object.assign({}, meta, configuration);

    if (Object.keys(info).length) {
        updateContent(container, info);
    }
}

function updateTitle(container, text, tagName) {
    const oldTitle = container.getElementsByTagName(tagName)[0];

    const newText = document.createTextNode(text);
    const newTitle = document.createElement(tagName);
    newTitle.appendChild(newText);

    container.replaceChild(newTitle, oldTitle);
}

function updateContent(container, info, id = "content") {
    const content = document.getElementById(id);
    const newContent = document.createElement("div");
    newContent.setAttribute("id", id);

    Object.entries(info).forEach(([key, value]) => {
        if (typeof value === "object") {
            value = JSON.stringify(value);
        }

        const text = document.createTextNode(`${key}: ${value}`);
        const paragraph = document.createElement("p");
        paragraph.appendChild(text);

        newContent.appendChild(paragraph);
    });

    container.replaceChild(newContent, content);
}

function mouseover(node) {
    updateText(node);
    const sequenceArray = getAncestors(node);
    updateBreadcrumbs(sequenceArray);

        d3.selectAll("path")
        .style("opacity", 0.3);

        svg.selectAll("path")
        .filter(node => (sequenceArray.indexOf(node) >= 0))
        .style("opacity", 1);
}


d3.select(self.frameElement).style("height", height + "px");

function initializeBreadcrumbTrail() {
  const trail = d3.select("#sequence").append("svg:svg")
      .attr("width", width)
      .attr("height", 50)
      .attr("id", "trail");
}

function breadcrumbPoints(node, i) {
    const { w, h, t } = breadcrumbsDimensions;
    const points = [
        "0, 0",
        `${w}, 0`,
        `${w + t}, ${h / 2}`,
        `${w}, ${h}`,
        `0, ${h}`,
    ];

    if (i > 0) {
        points.push(`${t}, ${h / 2}`);
    }

    return points.join(" ");
}

function updateBreadcrumbs(nodeArray) {
    const { w, h, t, s } = breadcrumbsDimensions;
    const g = d3.select("#trail")
        .selectAll("g")
        .data(nodeArray, function(node) { return node.name + node.depth; });

    const entering = g.enter().append("svg:g");

    entering.append("svg:polygon")
        .attr("points", breadcrumbPoints)
        .style("fill", colors);

    entering.append("svg:text")
        .attr("x", (w + t) / 2)
        .attr("y", h / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .text(node => node.name);

    g.attr("transform", (node, i) =>
        `translate(${i * (w + s)}, 0)`);

    g.exit().remove();
}

function mouseleave(node) {
     d3.selectAll("path").on("mouseover", null);

     d3.selectAll("path")
     .transition()
     .duration(500)
     .style("opacity", 1)
     .each("end", function() {
        d3.select(this).on("mouseover", mouseover);
     });

}

function getAncestors(node) {
    const path = [];
    while (node) {
        path.unshift(node);
        node = node.parent;
    }

    return path;
}

function colors(node) {
    if (node.color) {
        return node.color;
    }

    if (hasError(node)) {
        return ERROR_COLOR;
    } else {
        return SUCCESS_COLOR;
    }
}

function hasError(node) {
    if (node.error) {
        setErrored(node);
        return true;
    }

    const { meta, children } = node;
    const hasNestedError = (meta && meta.error) || (children && children.some(hasError));
    if (hasNestedError) {
        setErrored(node);
    }

    return hasNestedError;
}


function setErrored(node) {
    node.color = ERROR_COLOR;
}

function formatData(json) {
    const toNameChildrenPairs = (obj, parentKey) => {
        const children = Object.entries(obj).map(([key, value]) => {
            if (key === "configuration") {
                configurations[parentKey] = value;
                return {
                    name: key,
                    value,
                };
            }

            const defaults = {
                name: key,
                size: 100,
            };

            const hasObjectChild = obj =>
                Object.entries(obj).some(([ key, value ]) =>
                    key !== "error" && typeof value === "object");

            let additional = {};
            if (typeof value === "object") {
                if (hasObjectChild(value)) {
                    additional.children = toNameChildrenPairs(value, key);
                } else {
                    additional.meta = value;
                }
            } else {
                additional.children = value;
            }

            return Object.assign(defaults, additional);
        });

        return children;
    };

    const children = toNameChildrenPairs(json);
    const formatted = {
        name: "report",
        children,
    };

    return formatted;
}
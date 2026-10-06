const generationOrder = ["G", "BB", "X", "M", "Z", "A", "B"];

const treeContainer = document.getElementById("family-tree");

async function loadFamily() {
    const response = await fetch("family.json");
    const family = await response.json();

    drawTree(family);
}


function drawTree(family) {

    const cardWidth = 180;
    const cardHeight = 140;

    const spouseGap = 30;
    const unitGap = 100;

    const verticalGap = 180;

    const generationY = {};

    generationOrder.forEach((generation, index) => {
        generationY[generation] = index * verticalGap + 100;
    });


    /*
     * Create a lookup table so we can
     * quickly find people by ID.
     */
    const people = {};

    family.forEach(person => {
        people[person.id] = person;
    });


    /*
     * Build spouse units.
     *
     * A married couple becomes one visual unit.
     * An unmarried person becomes a unit by themselves.
     */
    const units = [];
    const usedPeople = new Set();

    family.forEach(person => {

        if (usedPeople.has(person.id)) {
            return;
        }

        if (
            person.spouse &&
            people[person.spouse] &&
            !usedPeople.has(person.spouse)
        ) {

            const spouse = people[person.spouse];

            units.push({
                people: [person, spouse],
                generation: person.generation
            });

            usedPeople.add(person.id);
            usedPeople.add(spouse.id);

        } else {

            units.push({
                people: [person],
                generation: person.generation
            });

            usedPeople.add(person.id);
        }
    });


    /*
     * Group units by generation.
     */
    const unitsByGeneration = {};

    units.forEach(unit => {

        if (!unitsByGeneration[unit.generation]) {
            unitsByGeneration[unit.generation] = [];
        }

        unitsByGeneration[unit.generation].push(unit);
    });


    /*
     * Calculate SVG size.
     */
    const maxUnits = Math.max(
        ...Object.values(unitsByGeneration)
            .map(units => units.length)
    );

    const width = Math.max(
        window.innerWidth,
        maxUnits * (cardWidth * 2 + spouseGap + unitGap) + 300
    );

    const height =
        generationOrder.length * verticalGap + 300;


    /*
     * Create SVG.
     */
    const svg = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg"
    );

    svg.setAttribute("width", width);
    svg.setAttribute("height", height);

    svg.setAttribute(
        "viewBox",
        `0 0 ${width} ${height}`
    );

    treeContainer.appendChild(svg);


    /*
     * Draw each generation.
     */
    generationOrder.forEach(generation => {

    const generationUnits =
        unitsByGeneration[generation];

    if (!generationUnits) {
        return;
    }

    const y = generationY[generation];

    let currentX = 200;

    generationUnits.forEach(unit => {

        const unitWidth =
            unit.people.length === 2
                ? cardWidth * 2 + spouseGap
                : cardWidth;

        unit.x = currentX;
        unit.y = y;


        currentX += unitWidth + unitGap;
    });
});

/*
 * Move children so they are centered
 * underneath their parent unit.
 */
units.forEach(parentUnit => {

    const parent = parentUnit.people[0];

    if (!parent.children || parent.children.length === 0) {
        return;
    }

    const parentWidth =
        parentUnit.people.length === 2
            ? cardWidth * 2 + spouseGap
            : cardWidth;

    const parentCenter =
        parentUnit.x + parentWidth / 2;

    const childUnits = [];

    parent.children.forEach(childId => {

        const childUnit = units.find(unit =>
            unit.people.some(person =>
                person.id === childId
            )
        );

        if (childUnit && !childUnits.includes(childUnit)) {
            childUnits.push(childUnit);
        }

    });

    if (childUnits.length === 0) {
        return;
    }

    /*
     * Calculate the total width of all children.
     */
    const childWidths = childUnits.map(unit =>
        unit.people.length === 2
            ? cardWidth * 2 + spouseGap
            : cardWidth
    );

    const totalWidth =
        childWidths.reduce(
            (sum, width) => sum + width,
            0
        ) +
        unitGap * (childUnits.length - 1);

    /*
     * Start far enough left that the
     * entire sibling group is centered.
     */
    let childX =
        parentCenter - totalWidth / 2;

    childUnits.forEach((childUnit, index) => {

        childUnit.x = childX;

        const childWidth =
            childWidths[index];

        childX += childWidth + unitGap;

    });
});

/*
 * Shift the entire tree right if anything
 * extends too far toward the left edge.
 */
const leftMargin = 200;

const leftmostX = Math.min(
    ...units.map(unit => unit.x)
);

if (leftmostX < leftMargin) {

    const shiftX = leftMargin - leftmostX;

    units.forEach(unit => {
        unit.x += shiftX;
    });

}


/*
 * Now draw all family units at their final positions.
 */
units.forEach(unit => {

    drawUnit(
        svg,
        unit,
        unit.x,
        unit.y,
        cardWidth,
        cardHeight,
        spouseGap
    );

});


drawParentConnections(
    svg,
    family,
    people,
    units,
    cardWidth,
    cardHeight,
    spouseGap
);

}


function drawUnit(
    svg,
    unit,
    x,
    y,
    cardWidth,
    cardHeight,
    spouseGap
) {

    unit.people.forEach((person, index) => {

        const personX =
            x + index * (cardWidth + spouseGap);

        drawPerson(
            svg,
            person,
            personX,
            y,
            cardWidth,
            cardHeight
        );
    });


    /*
     * Draw spouse connection.
     */
    if (unit.people.length === 2) {

        const line = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "line"
        );

        line.setAttribute(
            "x1",
            x + cardWidth
        );

        line.setAttribute(
            "y1",
            y + cardHeight / 2
        );

        line.setAttribute(
            "x2",
            x + cardWidth + spouseGap
        );

        line.setAttribute(
            "y2",
            y + cardHeight / 2
        );

        line.setAttribute(
            "stroke",
            "#333"
        );

        line.setAttribute(
            "stroke-width",
            "3"
        );

        svg.appendChild(line);
    }
}


function drawPerson(
    svg,
    person,
    x,
    y,
    width,
    height
) {

    const group = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "g"
    );


    /*
     * Card
     */
    const rectangle = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect"
    );

    rectangle.setAttribute("x", x);
    rectangle.setAttribute("y", y);

    rectangle.setAttribute("width", width);
    rectangle.setAttribute("height", height);

    rectangle.setAttribute("rx", 8);

    rectangle.setAttribute(
        "fill",
        "white"
    );

    rectangle.setAttribute(
        "stroke",
        "#333"
    );

    group.appendChild(rectangle);


    /*
     * Photo placeholder
     */
    const photo = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect"
    );

    photo.setAttribute(
        "x",
        x + 10
    );

    photo.setAttribute(
        "y",
        y + 10
    );

    photo.setAttribute(
        "width",
        width - 20
    );

    photo.setAttribute(
        "height",
        85
    );

    photo.setAttribute(
        "fill",
        "#ddd"
    );

    group.appendChild(photo);


    /*
     * Name
     */
    const name = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text"
    );

    name.setAttribute(
        "x",
        x + width / 2
    );

    name.setAttribute(
        "y",
        y + 120
    );

    name.setAttribute(
        "text-anchor",
        "middle"
    );

    name.setAttribute(
        "font-size",
        "16"
    );

    name.setAttribute(
        "font-weight",
        "bold"
    );

    name.setAttribute(
        "fill",
        "#222"
    );

    name.textContent = person.name;

    group.appendChild(name);

    svg.appendChild(group);
}


function drawLine(svg, x1, y1, x2, y2) {

    const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
    );

    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);

    line.setAttribute("stroke", "#333");
    line.setAttribute("stroke-width", "3");

    svg.appendChild(line);
}


function drawParentConnections(
    svg,
    family,
    people,
    units,
    cardWidth,
    cardHeight,
    spouseGap
) {

    /*
     * Store the exact position of every person.
     */
    const positions = {};

    units.forEach(unit => {

        unit.people.forEach((person, index) => {

            const personX =
                unit.x +
                index * (cardWidth + spouseGap);

            positions[person.id] = {

                /*
                 * Center of this specific person's card.
                 */
                centerX:
                    personX + cardWidth / 2,

                topY:
                    unit.y,

                bottomY:
                    unit.y + cardHeight

            };

        });

    });


    /*
     * Draw connections from each parent unit
     * to its children.
     */
    units.forEach(parentUnit => {

const children = [];

parentUnit.people.forEach(parent => {

    family.forEach(child => {

        if (
            child.parents &&
            child.parents.includes(parent.id) &&
            !children.includes(child.id)
        ) {
            children.push(child.id);
        }

    });

});

        if (children.length === 0) {
            return;
        }


        /*
         * Center of the entire parent unit.
         *
         * For a couple this is halfway between
         * the two spouses.
         */
        const parentWidth =
            parentUnit.people.length === 2
                ? cardWidth * 2 + spouseGap
                : cardWidth;

        const parentCenterX =
            parentUnit.x + parentWidth / 2;


        /*
         * IMPORTANT:
         *
         * The parent → child connection begins
         * at the BOTTOM of the parent cards.
         *
         * This keeps it completely out of the
         * parent's name area.
         */
        const parentBottomY =
            parentUnit.y + cardHeight;


        /*
         * Find the individual position of each child.
         */
        const childPositions = children
            .map(childId => positions[childId])
            .filter(Boolean);


        if (childPositions.length === 0) {
            return;
        }


        /*
         * All children in this generation share
         * the same top Y coordinate.
         */
        const childTopY =
            childPositions[0].topY;


        /*
         * Put the branching line halfway between
         * the bottom of the parents and the top
         * of the children.
         */
        const branchY =
            parentBottomY +
            (childTopY - parentBottomY) / 2;


        /*
         * Find the individual child centers.
         */
        const childXs =
            childPositions.map(
                position => position.centerX
            );

        const minX =
            Math.min(...childXs);

        const maxX =
            Math.max(...childXs);


/*
 * Spouse connection → bottom of parent cards.
 *
 * This connects the vertical family line to
 * the horizontal line between the spouses.
 */
if (parentUnit.people.length === 2) {

    const spouseLineY =
        parentUnit.y + cardHeight / 2;

    drawLine(
        svg,
        parentCenterX,
        spouseLineY,
        parentCenterX,
        parentBottomY
    );
}


/*
 * Bottom of parent cards → branching junction.
 */
drawLine(
    svg,
    parentCenterX,
    parentBottomY,
    parentCenterX,
    branchY
);

        /*
         * Horizontal sibling branch.
         */
        drawLine(
            svg,
            minX,
            branchY,
            maxX,
            branchY
        );


        /*
         * Branch → each individual child.
         */
        childPositions.forEach(position => {

            drawLine(
                svg,
                position.centerX,
                branchY,
                position.centerX,
                position.topY
            );

        });

    });
}



loadFamily();
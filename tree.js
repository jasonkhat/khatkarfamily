
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

    const verticalGap = 180;

    const generationY = {};

    generationOrder.forEach((generation, index) => {
        generationY[generation] =
            index * verticalGap + 100;
    });


    /*
     * PEOPLE LOOKUP
     */

    const people = {};

    family.forEach(person => {
        people[person.id] = person;
    });


    /*
     * CREATE VISUAL UNITS
     *
     * A unit is only a visual convenience.
     *
     * Biological relationships are ALWAYS based
     * on individual people.
     */

    const units = [];
    const personToUnit = {};
    const used = new Set();

    family.forEach(person => {

        if (used.has(person.id)) {
            return;
        }

        let unit;

        if (
            person.spouse &&
            people[person.spouse] &&
            !used.has(person.spouse)
        ) {

            const spouse = people[person.spouse];

            unit = {
                people: [person, spouse],
                generation: person.generation,
                x: 0,
                y: generationY[person.generation]
            };

            used.add(person.id);
            used.add(spouse.id);

        } else {

            unit = {
                people: [person],
                generation: person.generation,
                x: 0,
                y: generationY[person.generation]
            };

            used.add(person.id);
        }

        units.push(unit);

        unit.people.forEach(member => {
            personToUnit[member.id] = unit;
        });

    });


    /*
     * BASIC INITIAL POSITION
     *
     * This prevents people with no parents from
     * having undefined positions.
     */

    const unitsByGeneration = {};

    generationOrder.forEach(generation => {
        unitsByGeneration[generation] = [];
    });

    units.forEach(unit => {

        if (!unitsByGeneration[unit.generation]) {
            unitsByGeneration[unit.generation] = [];
        }

        unitsByGeneration[unit.generation].push(unit);

    });


    generationOrder.forEach(generation => {

        const generationUnits =
            unitsByGeneration[generation];

        let x = 200;

        generationUnits.forEach(unit => {

            unit.x = x;

            const width =
                unit.people.length === 2
                    ? cardWidth * 2 + spouseGap
                    : cardWidth;

            x += width + 100;

        });

    });


    /*
     * POSITION BIOLOGICAL CHILDREN
     *
     * This is the important part.
     *
     * Each individual child receives a position
     * based ONLY on:
     *
     * 1. Their biological parents
     * 2. Their birth order
     *
     * Their spouse is ignored while determining
     * their biological position.
     */

    const siblingGroups = {};

    family.forEach(person => {

        if (
            !Array.isArray(person.parents) ||
            person.parents.length === 0
        ) {
            return;
        }

        const parentKey =
            [...person.parents]
                .sort()
                .join("|");

        if (!siblingGroups[parentKey]) {
            siblingGroups[parentKey] = [];
        }

        siblingGroups[parentKey].push(person);

    });


    /*
     * Process each biological family.
     */

    Object.values(siblingGroups).forEach(children => {

        children.sort((a, b) => {

            return (
                (a.birthOrder ?? 999) -
                (b.birthOrder ?? 999)
            );

        });


        /*
         * Find the biological parents.
         */

        const parentPeople =
            children[0].parents
                .map(id => people[id])
                .filter(Boolean);


        if (parentPeople.length === 0) {
            return;
        }


        /*
         * Find the visual units containing
         * those biological parents.
         */

        const parentUnits =
            parentPeople
                .map(parent => personToUnit[parent.id])
                .filter(Boolean);


        if (parentUnits.length === 0) {
            return;
        }


        /*
         * Find the center of the parent family.
         */

        let parentLeft = Infinity;
        let parentRight = -Infinity;

        parentUnits.forEach(unit => {

            const width =
                unit.people.length === 2
                    ? cardWidth * 2 + spouseGap
                    : cardWidth;

            parentLeft =
                Math.min(parentLeft, unit.x);

            parentRight =
                Math.max(
                    parentRight,
                    unit.x + width
                );

        });

        const parentCenter =
            (parentLeft + parentRight) / 2;


        /*
         * Biological sibling spacing.
         *
         * IMPORTANT:
         *
         * We use ONE card width per child.
         *
         * A spouse does not consume a biological
         * sibling position.
         */

        const siblingGap = 100;

        const totalWidth =
            children.length * cardWidth +
            (children.length - 1) * siblingGap;


        let childCenterX =
            parentCenter - totalWidth / 2;


        /*
         * Position each biological child.
         */

        children.forEach(child => {

            const unit =
                personToUnit[child.id];

            if (!unit) {
                return;
            }


            /*
             * Find this person's position inside
             * their spouse unit.
             */

            const index =
                unit.people.findIndex(
                    member =>
                        member.id === child.id
                );


            /*
             * Desired LEFT EDGE of the child's
             * individual card.
             */

            const desiredX =
                childCenterX;


            /*
             * If the biological child is the first
             * spouse, the unit starts here.
             */

            if (index === 0) {

                unit.x = desiredX;

            }

            /*
             * If the biological child is the second
             * spouse, move the entire visual unit
             * left so THIS PERSON occupies the
             * biological position.
             */

            else {

                unit.x =
                    desiredX -
                    cardWidth -
                    spouseGap;

            }


            unit.y =
                generationY[child.generation];


            childCenterX +=
                cardWidth + siblingGap;

        });

    });


    /*
     * CALCULATE SVG SIZE
     */

    let rightmost = 0;

    units.forEach(unit => {

        const width =
            unit.people.length === 2
                ? cardWidth * 2 + spouseGap
                : cardWidth;

        rightmost =
            Math.max(
                rightmost,
                unit.x + width
            );

    });


    const width =
        Math.max(
            window.innerWidth,
            rightmost + 300
        );

    const height =
        generationOrder.length *
        verticalGap +
        300;


    /*
     * CREATE SVG
     */

    const svg =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg"
        );

    svg.setAttribute(
        "width",
        width
    );

    svg.setAttribute(
        "height",
        height
    );

    svg.setAttribute(
        "viewBox",
        `0 0 ${width} ${height}`
    );

    treeContainer.innerHTML = "";

    treeContainer.appendChild(svg);


    /*
     * DRAW PEOPLE
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


    /*
     * DRAW BIOLOGICAL CONNECTIONS
     */

    drawParentConnections(
        svg,
        family,
        people,
        personToUnit,
        units,
        cardWidth,
        cardHeight,
        spouseGap
    );

}


/*
 * DRAW A PERSON / SPOUSE UNIT
 */

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
            x +
            index *
            (cardWidth + spouseGap);

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
     * Spouse connection
     */

    if (unit.people.length === 2) {

        const line =
            document.createElementNS(
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


/*
 * DRAW PERSON CARD
 */

function drawPerson(
    svg,
    person,
    x,
    y,
    width,
    height
) {

    const group =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "g"
        );


    const rectangle =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "rect"
        );

    rectangle.setAttribute(
        "x",
        x
    );

    rectangle.setAttribute(
        "y",
        y
    );

    rectangle.setAttribute(
        "width",
        width
    );

    rectangle.setAttribute(
        "height",
        height
    );

    rectangle.setAttribute(
        "rx",
        8
    );

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
     * Photo
     */

    const photo =
        document.createElementNS(
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

    const name =
        document.createElementNS(
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

    name.textContent =
        person.name;

    group.appendChild(name);

    svg.appendChild(group);

}


/*
 * DRAW LINE
 */

function drawLine(
    svg,
    x1,
    y1,
    x2,
    y2
) {

    const line =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "line"
        );

    line.setAttribute(
        "x1",
        x1
    );

    line.setAttribute(
        "y1",
        y1
    );

    line.setAttribute(
        "x2",
        x2
    );

    line.setAttribute(
        "y2",
        y2
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


/*
 * DRAW BIOLOGICAL PARENT CONNECTIONS
 *
 * This is intentionally based on INDIVIDUAL
 * biological parent IDs.
 */

function drawParentConnections(
    svg,
    family,
    people,
    personToUnit,
    units,
    cardWidth,
    cardHeight,
    spouseGap
) {

    /*
     * Exact position of every individual card.
     */

    const positions = {};

    units.forEach(unit => {

        unit.people.forEach((person, index) => {

            const x =
                unit.x +
                index *
                (cardWidth + spouseGap);

            positions[person.id] = {

                left: x,

                centerX:
                    x + cardWidth / 2,

                topY:
                    unit.y,

                bottomY:
                    unit.y + cardHeight

            };

        });

    });


    /*
     * Group children by their EXACT biological
     * parent set.
     */

    const childrenByParents = {};

    family.forEach(child => {

        if (
            !Array.isArray(child.parents) ||
            child.parents.length === 0
        ) {
            return;
        }

        const key =
            [...child.parents]
                .sort()
                .join("|");

        if (!childrenByParents[key]) {
            childrenByParents[key] = [];
        }

        childrenByParents[key].push(child);

    });


    /*
     * Draw each biological family connection.
     */

    Object.values(childrenByParents)
        .forEach(children => {

            if (children.length === 0) {
                return;
            }


            /*
             * Sort by birth order.
             */

            children.sort((a, b) =>
                (a.birthOrder ?? 999) -
                (b.birthOrder ?? 999)
            );


            /*
             * Get the biological parents.
             */

            const parents =
                children[0].parents
                    .map(id => people[id])
                    .filter(Boolean);


            if (parents.length === 0) {
                return;
            }


            /*
             * Get positions of the actual parents.
             */

            const parentPositions =
                parents
                    .map(parent =>
                        positions[parent.id]
                    )
                    .filter(Boolean);


            if (parentPositions.length === 0) {
                return;
            }


            /*
             * Parent junction.
             *
             * If there are two parents, connect
             * from the midpoint between them.
             */

            let parentCenterX;

            if (parentPositions.length === 1) {

                parentCenterX =
                    parentPositions[0].centerX;

            } else {

                const left =
                    Math.min(
                        ...parentPositions.map(
                            p => p.centerX
                        )
                    );

                const right =
                    Math.max(
                        ...parentPositions.map(
                            p => p.centerX
                        )
                    );

                parentCenterX =
                    (left + right) / 2;

            }


            /*
             * Parent bottom.
             */

            const parentBottomY =
                Math.max(
                    ...parentPositions.map(
                        p => p.bottomY
                    )
                );


            /*
             * Child positions.
             */

            const childPositions =
                children
                    .map(child =>
                        positions[child.id]
                    )
                    .filter(Boolean);


            if (childPositions.length === 0) {
                return;
            }


            /*
             * Child top.
             */

            const childTopY =
                Math.min(
                    ...childPositions.map(
                        p => p.topY
                    )
                );


            /*
             * Branch height.
             */

            const branchY =
                parentBottomY +
                (childTopY - parentBottomY) / 2;


            /*
             * Connect spouses to the parent junction
             * when both biological parents are spouses.
             */

            if (parentPositions.length === 2) {

                /*
                 * Horizontal line between the parents.
                 */

                const spouseY =
                    parentPositions[0].topY +
                    cardHeight / 2;

                drawLine(
                    svg,
                    parentPositions[0].centerX,
                    spouseY,
                    parentPositions[1].centerX,
                    spouseY
                );


                /*
                 * Vertical from spouse midpoint
                 * to the bottom of the cards.
                 */

                drawLine(
                    svg,
                    parentCenterX,
                    spouseY,
                    parentCenterX,
                    parentBottomY
                );

            }


            /*
             * Parent → branch.
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

            const minChildX =
                Math.min(
                    ...childPositions.map(
                        p => p.centerX
                    )
                );

            const maxChildX =
                Math.max(
                    ...childPositions.map(
                        p => p.centerX
                    )
                );

            drawLine(
                svg,
                minChildX,
                branchY,
                maxChildX,
                branchY
            );


            /*
             * Branch → each biological child.
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

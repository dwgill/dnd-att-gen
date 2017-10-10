// import _ from 'lodash';
// <script src="//cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.4/lodash.min.js"></script>
// <script>

function d6() {
    return _.random(1, 6, false);
}

/** General representation of an attribute score. */
abstract class AttributeScore {
    /** The dice rolls that constitute this score. */
    components: number[];
    /** The name of the attribute associated with this score, if any. */
    name?: String;

    constructor(dice_results: number[], name?: String) {
        this.components = dice_results;
        this.name = name? name.toUpperCase() : null;
    }

    /** Computes the modifier for this score. */
    modifier(): number {
        return Math.floor((this.value() - 10) / 2);
    }
    /** Indicates whether a name is associated with this attribute. */
    has_name(): boolean {
        return this.name != null;
    }
    
    /** Computes the score's total value. */
    abstract value(): number;
    /** Returns a list of the numbers used in determining the score's value. */
    abstract utilized_components(): number[];
    /** Returns a list of the numbers excluded from the scores value. */
    abstract discarded_components(): number[];
}

/** Representation of a classic attribute score.
 * i.e. 3d6
 */
class ClassicScore extends AttributeScore {
    constructor(dice_results?: number[], name?: String) {
        if (!dice_results) {
            super(_.times(3, d6), name);
        } else {
            super(dice_results, name);
        }
    }
    /** Computes the score's total value. */
    value() {
        return _.sum(this.components);
    }
    /** Returns a list of the numbers used in determining the score's value. */
    utilized_components() {
        return _.clone(this.components);
    }
    /** Returns a list of the numbers excluded from the scores value. */
    discarded_components() {
        return [];
    }
}

/** Representation of a contemporary attribute score.
 * i.e. 4d6d1
 */
class ModernScore extends AttributeScore {
    constructor(dice_results?: number[], name?: String) {
        if (!dice_results) {
            super(_.times(4, d6), name);
        } else {
            super(dice_results, name);
        }
    }
    /** Computes the score's total value. */
    value() {
        return _.sum(this.components) - _.min(this.components);
    }
    /** Returns a list of the numbers used in determining the score's value. */
    utilized_components() {
        var min_index = _.findIndex(this.components, _.min(this.components));
        return _.filter(this.components, (value, index) => index !== min_index);
    }
    /** Returns a list of the numbers excluded from the scores value. */
    discarded_components() {
        return [_.min(this.components)];
    }
}

interface AttValidator  {
    (scores: number[]): boolean;
}



function matt_colville_validate(scores: AttributeScore[]) {
    return _.filter(scores, (score) => score.value() >= 15).length >= 2;
}

// </script>
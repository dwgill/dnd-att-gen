// import _ from 'lodash';
// <script src="//cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.4/lodash.min.js"></script>
// <script>

// FEATURES:
// DICE ROLLS:
// - 3d6
// - 4d6k3
// - 2d6+6

// CONSTRAINTS:
// - Straight
// - At least 2 scores >= X
// - At least 1 score >= X
// - Sum(mods) >= 2
// - Sum(mods) >= 1
// - Sum(scores) >= 70

interface ScoreRollout {
    component_dice: number[];
    discarded_dice: number[];
}

type ScoreRolloutSet = ScoreRollout[];

interface DiceRollMethod {
    (): ScoreRollout;
}

interface ScoreSetValidator {
    (scoreRolloutSet: ScoreRolloutSet): boolean;
}

enum Attribute {
    str = "STR",
    dex = "DEX",
    con = "CON",
    int = "INT",
    wis = "WIS",
    cha = "CHA",
}

function d6() { return _.random(1, 6, false); }

/** Various means of randomly generating an ability score. */
namespace DiceRolls {
    /** The sum of the highest of three six-sided dice. */
    export function _3d6(): ScoreRollout {
        return {
            component_dice: [d6(), d6(), d6()],
            discarded_dice: [],
        };
    }

    /** The sum of the highest three of four six-sided dice. */
    export function _4d6k3(): ScoreRollout {
        var the_dice = [d6(), d6(), d6(), d6()];
        var lowest_dice = the_dice.splice(the_dice.indexOf(_.min(the_dice)), 1);
        return {
            component_dice: the_dice,
            discarded_dice: lowest_dice,
        };
    }

    /** Six plus the sum of two six-sided dice. */
    export function _2d6p6(): ScoreRollout {
        return {
            component_dice: [6, d6(), d6()],
            discarded_dice: [],
        }
    }
}

/** Various requirements one could have  */
namespace Validators {

    /** At least two scores must be 15 or higher. */
    export function colville_orig(scoreRolloutSet: ScoreRolloutSet) {
        return at_least_x_scores_of_y_value(scoreRolloutSet, 15, 2);
    }

    /** At least one score must be 15 or higher. */
    export function colville_lite(scoreRolloutSet: ScoreRolloutSet) {
        return at_least_x_scores_of_y_value(scoreRolloutSet, 15, 1);
    }

    /** The sum of all the scores' ability modifiers must be at least +2. */
    export function colville_neo(scoreRolloutSet: ScoreRolloutSet) {
        return mod_of_at_least(scoreRolloutSet, 2);
    }

    /** The sum of the ability scores themselves must be at least 70. */
    export function mercer(scoreRolloutSet: ScoreRolloutSet) {
        return _(scoreRolloutSet)
            .map(scoreRollout => scoreRollout.component_dice)
            .map(_.sum)
            .sum() >= 70;
    }

    /** At least two scores must be 13 or higher. */
    export function strict_filthy_casual_hard(scoreRolloutSet: ScoreRolloutSet) {
        return at_least_x_scores_of_y_value(scoreRolloutSet, 13, 2);
    }

    /** All ability scores must be at least 6. */
    export function all_at_least_six(scoreRolloutSet: ScoreRolloutSet) {
        return _(scoreRolloutSet)
            .map(rolloutSet => rolloutSet.component_dice)
            .map(_.sum)
            .every(score => score >= 6);
    }

    /** At least two scores must be 15 or higher and no score less than 6. */
    export var validate_strict_filthy_casual = validate_all(strict_filthy_casual_hard, all_at_least_six);

    /** Combine validators into one validator.
     * Produce a validator that validates a score set only if all the
     * provided validators would each validate it.
     */
    function validate_all(...validators: ScoreSetValidator[]) {
        return function(scoreRolloutSet: ScoreRolloutSet) {
            return _(validators)
            .map(validator => validator(scoreRolloutSet))
            .every();
        }
    }

    function at_least_x_scores_of_y_value(scoreRolloutSet: ScoreRolloutSet, x: number, y: number) {
        return _(scoreRolloutSet)
            .map(score => score.component_dice)
            .map(dice => _.sum(dice))
            .filter(score => score >= x)
            .size() >= y;
    }

    function mod_of_at_least(scoreRolloutSet: ScoreRolloutSet, value: number) {
        return _(scoreRolloutSet).map(calc_modifier).sum().valueOf() >= value;
    }

}

/**
 * Roll according to the specified method until a valid set of scores
 * is produced according to the provided constraint.
 */
function roll_until_valid(diceRollMethod: DiceRollMethod, scoreRolloutSetValidator: ScoreSetValidator) {
    while(true) {
        var scores = _.times(6, diceRollMethod);
        if (scoreRolloutSetValidator(scores)) {
            return scores;
        }
    }
}

function calc_modifier(score: ScoreRollout) {
    return Math.floor((_.sum(score.component_dice) - 10) / 2);
}

/** Produce a string representation of the provided score rollout.
 * The format of the string is "{attribute}: {score} ({modifier}) {dice composition}"
 * The associated attribute, if omitted, will mean the string just starts
 * with the score.
 * @param score Object of the form {
 *      component_dice: number[],
 *      discarded_dice: number[],
 * }
 * @param attr A string indicating the relevant attribute
 */
function print_score(score: ScoreRollout, attr?: Attribute): string {
    var score_modifier: number = calc_modifier(score);
    var result: string[] = [];

    // Attribute Type (if applicable)
    if (attr) {
        result.push(attr, ": ");
    }

    // The score itself
    result.push(_.sum(score.component_dice).toString());

    // The modifier
    result.push(" (");
    if (score_modifier >= 0) { result.push("+"); }
    result.push(score_modifier.toString(), ")");

    // The composition of the score
    result.push(" [");
    result.push(score.component_dice.toString());

    // The discarded dice (if any)
    if (score.discarded_dice.length > 0) {
        result.push(" (", score.discarded_dice.toString(), ")");
    }
    result.push("]");

    return result.join("");
}

// </script>

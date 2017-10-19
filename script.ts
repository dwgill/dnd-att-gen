// I uncomment these lines when working in vscode to insure the linter recognizes $ and _
// import _ from 'lodash';
// import $ from 'jquery';
// These lines are necessary for embedding it on the page.
// <script src="//cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.4/lodash.min.js"></script>
// <script>

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

type Attribute = string;

function d6() { return _.random(1, 6, false); }


namespace Attributes {
    export const str: Attribute = "STR";
    export const dex: Attribute = "DEX";
    export const con: Attribute = "CON";
    export const int: Attribute = "INT";
    export const wis: Attribute = "WIS";
    export const cha: Attribute = "CHA";

    export function values(): Attribute[] {
        return [str, dex, con, int, wis, cha];
    }
}

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
        return at_least_y_scores_of_x_value(scoreRolloutSet, 15, 2);
    }

    /** At least one score must be 15 or higher. */
    export function colville_lite(scoreRolloutSet: ScoreRolloutSet) {
        return at_least_y_scores_of_x_value(scoreRolloutSet, 15, 1);
    }

    /** The sum of all the scores' ability modifiers must be at least +2. */
    export function colville_neo(scoreRolloutSet: ScoreRolloutSet) {
        return net_mod_of_at_least(scoreRolloutSet, 2);
    }
    
    /** The sum of all the scores' ability modifiers must be at least +0. */
    export function nonnegative_net_mod(scoreRolloutSet: ScoreRolloutSet) {
        return net_mod_of_at_least(scoreRolloutSet, 0);
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
        return at_least_y_scores_of_x_value(scoreRolloutSet, 13, 2);
    }
    
    /** At least one score must be 13 or higher. */
    export function one_at_least_13(scoreRolloutSet: ScoreRolloutSet) {
        return at_least_y_scores_of_x_value(scoreRolloutSet, 13, 1);
    }

    /** All ability scores must be at least 6. */
    export function none_under_six(scoreRolloutSet: ScoreRolloutSet) {
        return _(scoreRolloutSet)
            .map(rolloutSet => rolloutSet.component_dice)
            .map(_.sum)
            .every(score => score >= 6);
    }

    /** At least two scores must be 13 or higher and no score less than 6. */
    export var strict_filthy_casual = validate_all(strict_filthy_casual_hard, none_under_six);

    /** Validates everything. */
    export function all_good(scoreRolloutSet: ScoreRolloutSet) {
        return true;
    }

    /** At least two scores >= 15, at least one score < 10 */
    export function gill_one(scoreRolloutSet: ScoreRolloutSet) {
        return (at_least_y_scores_of_x_value(scoreRolloutSet, 15, 2)
            && at_least_y_scores_less_than_x(scoreRolloutSet, 10, 1))
    }

    /** At least one score >= 15, at least one *other* score >= 13 */
    export function gill_two(scoreRolloutSet: ScoreRolloutSet) {
        var thirteen_pluses = _(scoreRolloutSet)
            .map(scoreRollout => scoreRollout.component_dice)
            .map(componentDice => _.sum(componentDice))
            .filter(score => score >= 13);

        return thirteen_pluses.size() >= 2 && thirteen_pluses.max() >= 15;
    }

    /** Combine validators into one validator.
     * Produce a validator that validates a score set only if all the
     * provided validators would each validate it.
     */
    function validate_all(...validators: ScoreSetValidator[]): ScoreSetValidator {
        return function(scoreRolloutSet: ScoreRolloutSet) {
            return _(validators)
            .map(validator => validator(scoreRolloutSet))
            .every();
        }
    }

    /** Generalization of Colville's method */
    function at_least_y_scores_of_x_value(scoreRolloutSet: ScoreRolloutSet, x: number, y: number) {
        return _(scoreRolloutSet)
            .map(score => score.component_dice)
            .map(dice => _.sum(dice))
            .filter(score => score >= x)
            .size() >= y;
    }

    /** Insure there are at least y scores less than x */
    function at_least_y_scores_less_than_x(scoreRolloutSet: ScoreRolloutSet, x: number, y: number) {
        return _(scoreRolloutSet)
            .map(score => score.component_dice)
            .map(dice => _.sum(dice))
            .filter(score => score < x)
            .size() >= y;
    }

    /** Generalization of Colville's new method */
    function net_mod_of_at_least(scoreRolloutSet: ScoreRolloutSet, value: number) {
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

/** Produce a string representation of the provided score rollout. */
function print_score(score: ScoreRollout, attr?: Attribute, show_dice?: boolean): string {
    var score_modifier: number = calc_modifier(score);
    var result: string[] = [];

    // Attribute Type (if applicable)
    if (attr) {
        var attr_str; 
        result.push(attr, ": ");
    }

    // The score itself
    result.push(_.sum(score.component_dice).toString());

    // The modifier
    result.push(" (");
    if (score_modifier >= 0) { result.push("+"); }
    result.push(score_modifier.toString(), ")");

    // The composition of the score
    if (show_dice) {
        result.push(" [");
        result.push(score.component_dice.toString());

        // The discarded dice (if any)
        if (score.discarded_dice.length > 0) {
            result.push(" (", score.discarded_dice.toString(), ")");
        }
        result.push("]");
    }

    return result.join("");
}

function rollout_scores(dice_roll: DiceRollMethod, validator: ScoreSetValidator,
        in_order: boolean, show_dice: boolean) {
    _(roll_until_valid(dice_roll, validator))
    .zipWith(Attributes.values())
    .map(([score_rollout, attr]) => print_score(score_rollout, in_order ? attr : null, show_dice))
    .forEach((score_str, index) => $("#att" + index).text(score_str));
}

function fetch_parameters(): [DiceRollMethod, ScoreSetValidator, boolean, boolean] {
    var dice_roll: DiceRollMethod;
    switch($("#diceroll-selection").val()) {
        case "4d6k3":
            dice_roll = DiceRolls._4d6k3;
            break;
        case "3d6":
            dice_roll = DiceRolls._3d6;
            break;
        case "2d6p6":
            dice_roll = DiceRolls._2d6p6;
            break;
        default:
            dice_roll = DiceRolls._4d6k3;
            $("#diceroll-selection").val("4d6k3");
            break;
    }

    var validator: ScoreSetValidator;
    switch($("#validator-selection").val()) {
        case "colville":
            validator = Validators.colville_orig;
            break;
        case "straight":
            validator = Validators.all_good;
            break;
        case "colville-lite":
            validator = Validators.colville_lite;
            break;
        case "mercer":
            validator = Validators.mercer;
            break;
        case "colville-neo":
            validator = Validators.colville_neo;
            break;
        case "sfc-hard":
            validator = Validators.strict_filthy_casual_hard;
            break;
        case "one-13-or-more":
            validator = Validators.one_at_least_13;
            break;
        case "sfc":
            validator = Validators.strict_filthy_casual;
            break;
        case "none-under-six":
            validator = Validators.none_under_six;
            break;
        case "nonnegative-mod":
            validator = Validators.nonnegative_net_mod;
            break;
        case "dwgill-one":
            validator = Validators.gill_one;
            break;
        case "dwgill-two":
            validator = Validators.gill_two;
            break;
        default:
            validator = Validators.all_good;
            $("#validator-selection").val("straight");
            break;
    }

    var in_order = $('#attr-order').is(":checked");

    var show_dice = $("#show-dice").is(":checked");

    return [dice_roll, validator, in_order, show_dice];
}

$("#rollout_button").click(function() {
    var [dice_roll, validator, in_order, show_dice] = fetch_parameters();
    rollout_scores(dice_roll, validator, in_order, show_dice);
});
// </script>

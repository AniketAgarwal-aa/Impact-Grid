from app.calculators import ImpactCalculator

def test_change_size():
    # Test change size multipliers
    size, mult = ImpactCalculator._change_size(1.0)
    assert size == "Small"
    assert mult == 1.05

    size, mult = ImpactCalculator._change_size(2.0)
    assert size == "Medium"
    assert mult == 1.15

    size, mult = ImpactCalculator._change_size(3.0)
    assert size == "Large"
    assert mult == 1.30

    size, mult = ImpactCalculator._change_size(4.0)
    assert size == "Very Large"
    assert mult == 1.50

def test_base_score():
    project = {"stage": "mid"}
    change = {"complexity": "high", "change_type": "addition", "priority": "critical"}
    # complexity: high (3) * 0.4 = 1.2
    # change_type: addition (1.3) * 0.25 = 0.325
    # priority: critical (1.8) * 0.2 = 0.36
    # stage: mid (1.0) * 0.15 = 0.15
    # total = 2.035 -> 2.04
    score = ImpactCalculator._base_score(project, change)
    assert score == 2.04

def test_affected_components():
    modules = ["authentication", "database", "unknown_module"]
    components = ImpactCalculator._affected_components(modules)
    assert len(components) == 3
    assert components[0]["name"] == "User Authentication Service"
    assert components[1]["name"] == "Primary Database"
    assert components[2]["name"] == "unknown_module"
    assert components[2]["type"] == "Custom Module"

def test_currency_conversion():
    assert ImpactCalculator.convert_currency(100.0, "USD", "USD") == 100.0
    assert ImpactCalculator.convert_currency(100.0, "INR", "INR") == 100.0
    # Assuming fallback rate 83.5
    assert ImpactCalculator.convert_currency(100.0, "USD", "INR") == 8350.0

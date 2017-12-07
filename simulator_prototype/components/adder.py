"""
    Adder component is a standalone core component for general architecture
    development.
"""

from components.abstract.ibus import iBusRead, iBusWrite
from components.bus import Bus
from components.logic_input import LogicInput
from components.abstract.combinational import Combinational

class Adder(Combinational):
    """
        Adder component implements a combinational adder of fixed bit width.
        Component expects two input signals to be of same size as internal.

        Output follows form:
            Y = A + B + CIN
            COUT = (A + B + CIN) >= (2 ^ BIT_WIDTH)
    """

    def __init__(self, name, size, a_bus, b_bus, y_bus=None, carry_in=None, carry_out=None):
        "Constructor will check for valid parameters, exception thrown on invalid"

        if not isinstance(name,str) or size <= 0 :
            raise ValueError('Initialization parameters invalid')
        self._name = name
        self._size = size

        if not isinstance(a_bus,iBusRead) or not isinstance(b_bus,iBusRead):
            raise ValueError('Input buses must be readable')
        elif not a_bus.size() == size or not b_bus.size() == size:
            raise ValueError('Input buses size must match internal size {}'.format(size))
        self._a = a_bus
        self._b = b_bus

        if not isinstance(y_bus,iBusWrite) and not y_bus is None:
            raise ValueError('If output bus defined then must be writable')
        elif not y_bus is None and not y_bus.size() == size:
            raise ValueError('Output bus size must match internal size {}'.foramt(size))
        self._y = y_bus

        if not isinstance(carry_in,iBusRead) and not carry_in is None:
            raise ValueError('If carry bus defined them must be readable')
        elif not carry_in is None and not carry_in.size() == 1:
            raise ValueError('Carry bus must be size {}'.format(1))
        self._carry_in = carry_in

        if not isinstance(carry_out,iBusWrite) and not carry_out is None:
            raise ValueError('If carry bus defined then must be writable')
        elif not carry_out is None and not carry_out.size() == 1:
            raise ValueError('Carry bus must be size {}'.format(1))
        self._carry_out = carry_out

    def run(self):
        "Implements add functionality with rollover and carry bit"

        #process input carry bit
        cin = 0
        if not self._carry_in is None:
            cin = self._carry_in.read()

        #run combinational function
        y = (self._a.read() + self._b.read() + cin)
        cout = 1 if y / (2**self._size) else 0

        #assert outputs
        if not self._y is None:
            self._y.write(y % 2**self._size)
        if not self._carry_out is None:
            self._carry_out.write(cout)

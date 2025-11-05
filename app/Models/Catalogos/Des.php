<?php

namespace App\Models\Catalogos;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Des extends Model
{	
	use HasFactory;
    protected $table = 'cat_des';

    public static  function getSel(){
    	return self::select('id as value','nombre as label')->where('dependencia', 1)->orWhere('ua',1)->orderBy('nombre')->get();
    }
}
